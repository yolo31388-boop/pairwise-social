
const { Tally } = require('./tally.js');

class VoteManager {
  constructor(players = [], options = {}) {
    this.players = players;
    this.tally = new Tally(players);
    // 平票处理规则: 'revote' 重新投票 | 'random' 随机处决 | 'none' 无人处决
    this.tieRule = options.tieRule || 'none';
    this.anonymous = Boolean(options.anonymous);
    this.timeLimit = options.timeLimit != null ? options.timeLimit : 60;
    this.rng = typeof options.rng === 'function' ? options.rng : Math.random;
    this.phase = 'voting';
    this.elapsed = 0;
    this.abstentions = new Set();
    this.lastResult = null;
    this.lastTie = null;
    this.closed = false;
    this.round = 1;
  }

  getPlayer(playerId) {
    return this.players.find(
      (player) => String(player.id) === String(playerId)
    );
  }

  isVotingOpen() {
    return (
      (this.phase === 'voting' || this.phase === 'revote') &&
      !this.closed &&
      !this.isTimedOut()
    );
  }

  hasBallot(voterId) {
    return (
      this.tally.hasVoted(voterId) || this.abstentions.has(String(voterId))
    );
  }

  tick(seconds = 1) {
    this.elapsed += seconds;
    return this.isTimedOut();
  }

  isTimedOut() {
    return this.elapsed >= this.timeLimit;
  }

  castVote(voterId, targetId) {
    if (!this.isVotingOpen()) return false;

    const voter = this.getPlayer(voterId);
    // 投票者必须是存活玩家
    if (!voter || !voter.alive) return false;

    const target = this.getPlayer(targetId);
    // 目标必须存在且存活，已死亡玩家不能被投票
    if (!target || !target.alive) return false;

    // 每个存活玩家有且仅有一票：已投票或已弃权均拒绝重复投票
    if (this.hasBallot(voterId)) return false;

    if (!this.tally.addVote(voterId, targetId)) return false;
    voter.vote = targetId;
    return true;
  }

  // 主动弃权；超时未投票也统一走这里
  abstain(voterId) {
    if (!this.isVotingOpen()) return false;
    const voter = this.getPlayer(voterId);
    if (!voter || !voter.alive) return false;
    if (this.hasBallot(voterId)) return false;
    this.abstentions.add(String(voterId));
    return true;
  }

  // 投票阶段结束前可以更改投票，以最后一次为准
  changeVote(voterId, targetId) {
    if (!this.isVotingOpen()) return false;
    const voter = this.getPlayer(voterId);
    if (!voter || !voter.alive) return false;
    const target = this.getPlayer(targetId);
    if (!target || !target.alive) return false;
    if (!this.tally.hasVoted(voterId)) return false;
    if (!this.tally.changeVote(voterId, targetId)) return false;
    voter.vote = targetId;
    return true;
  }

  // 超时：所有尚未投票的存活玩家按弃权处理
  applyTimeout() {
    for (const player of this.players) {
      if (player.alive && !this.hasBallot(player.id)) {
        this.abstentions.add(String(player.id));
      }
    }
  }

  // 公开投票显示 投票者 -> 目标；匿名投票隐藏投票者身份
  getPublicVotes() {
    if (this.anonymous) return {};
    const publicVotes = {};
    for (const [voterId, targetId] of Object.entries(this.tally.votes)) {
      const voter = this.getPlayer(voterId);
      publicVotes[voter ? voter.id : voterId] = targetId;
    }
    return publicVotes;
  }

  getTally() {
    return this.tally.getResults();
  }

  // 完整得票报告：每个玩家的得票数（含 0 票）、总票数、弃权名单
  getTallyReport() {
    const results = this.tally.getResults();
    const report = {};
    for (const player of this.players) {
      report[player.id] = results[String(player.id)] || 0;
    }
    return {
      votes: report,
      totalVotes: Object.keys(this.tally.votes).length,
      abstentions: [...this.abstentions].map((id) => {
        const player = this.getPlayer(id);
        return player ? player.id : id;
      }),
    };
  }

  endVoting() {
    // 重新投票之外，结束后结果固定，重复调用返回同一份结果
    if (this.closed && this.lastResult) return this.lastResult;

    if (this.isTimedOut()) this.applyTimeout();

    const results = this.tally.getResults();

    // 所有存活玩家都必须有一张票：结束时仍未投票的按弃权计入
    for (const player of this.players) {
      if (player.alive && !this.hasBallot(player.id)) {
        this.abstentions.add(String(player.id));
      }
    }

    const abstentionList = [...this.abstentions].map((id) => {
      const player = this.getPlayer(id);
      return player ? player.id : id;
    });

    // 无人投出有效票：无人处决
    if (Object.keys(results).length === 0) {
      this.lastResult = {
        elected: null,
        results,
        tie: false,
        noVotes: true,
        resolved: 'none',
        abstentions: abstentionList,
      };
      this.closed = true;
      this.phase = this._phaseAfterNoKill();
      return this.lastResult;
    }

    const maxVotes = Math.max(...Object.values(results));
    const winnerIds = Object.keys(results).filter(
      (targetId) => results[targetId] === maxVotes
    );

    if (winnerIds.length === 1) {
      const elected = this.getPlayer(winnerIds[0]).id;
      this.lastResult = {
        elected,
        results,
        tie: false,
        noVotes: false,
        resolved: 'elected',
        abstentions: abstentionList,
      };
      this.closed = true;
      this.phase = 'execution';
      return this.lastResult;
    }

    return this._resolveTie(winnerIds, results, abstentionList);
  }

  _resolveTie(winnerIds, results, abstentionList) {
    const tieResult = {
      elected: null,
      results,
      tie: true,
      noVotes: false,
      tiedPlayers: winnerIds.map((id) => this.getPlayer(id).id),
      abstentions: abstentionList,
    };

    if (this.tieRule === 'random') {
      const chosenIndex = Math.floor(this.rng() * winnerIds.length);
      const elected = this.getPlayer(winnerIds[chosenIndex]).id;
      this.lastResult = { ...tieResult, elected, resolved: 'random' };
      this.closed = true;
      this.phase = 'execution';
      return this.lastResult;
    }

    if (this.tieRule === 'revote') {
      this.lastTie = { ...tieResult, resolved: 'revote' };
      // 清空本轮票仓，平票者重新投票；多轮投票独立计票
      this.tally.reset();
      this.abstentions.clear();
      this.elapsed = 0;
      this.closed = false;
      this.phase = 'revote';
      this.round += 1;
      return this.lastTie;
    }

    // 默认：平票无人处决
    this.lastResult = { ...tieResult, resolved: 'none' };
    this.closed = true;
    this.phase = this._phaseAfterNoKill();
    return this.lastResult;
  }

  _phaseAfterNoKill() {
    const aliveCount = this.players.filter((player) => player.alive).length;
    return aliveCount <= 1 ? 'ended' : 'night';
  }

  // 处决当选玩家并更新玩家状态与游戏阶段
  execute(playerId) {
    if (this.phase !== 'execution' || !this.lastResult) return false;
    if (
      this.lastResult.elected == null ||
      String(this.lastResult.elected) !== String(playerId)
    ) {
      return false;
    }
    const target = this.getPlayer(playerId);
    if (!target || !target.alive) return false;
    target.kill();
    this.lastResult.executed = target.id;
    this.phase = this._phaseAfterNoKill() === 'ended' ? 'ended' : 'night';
    return true;
  }

  // 进入下一轮投票：票仓清零，不累加上一轮票数
  newRound() {
    this.tally.reset();
    this.tally.setPlayers(this.players);
    this.abstentions.clear();
    this.elapsed = 0;
    this.lastResult = null;
    this.lastTie = null;
    this.closed = false;
    this.phase = 'voting';
    this.round += 1;
    for (const player of this.players) {
      if (player.alive) player.vote = null;
    }
  }
}

module.exports = { VoteManager };
