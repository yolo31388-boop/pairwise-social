

const { Tally } = require('./tally.js');

const TIE_RULES = new Set(['revote', 'random', 'none']);

class VoteManager {
  constructor(players, options = {}) {
    this.players = players;
    this.tally = new Tally();
    this.phase = 'voting';
    this.timeLimit = options.timeLimit != null ? options.timeLimit : 60;
    this.elapsed = 0;
    this.anonymous = options.anonymous === true;
    this.tieRule = TIE_RULES.has(options.tieRule) ? options.tieRule : 'none';
    this.round = 1;
  }

  getPlayer(playerId) {
    return this.players.find((p) => p.id === playerId);
  }

  isTimedOut() {
    return this.elapsed >= this.timeLimit;
  }

  tick(seconds) {
    this.elapsed += seconds;
  }

  castVote(voterId, targetId) {
    if (this.phase !== 'voting' || this.isTimedOut()) return false;
    const voter = this.getPlayer(voterId);
    const target = this.getPlayer(targetId);
    if (!voter || !voter.isAlive()) return false;
    if (!target || !target.isAlive()) return false;
    if (this.tally.hasVoted(voterId)) return false;
    this.tally.addVote(voterId, targetId, voter.voteWeight());
    voter.vote = targetId;
    return true;
  }

  changeVote(voterId, targetId) {
    if (this.phase !== 'voting' || this.isTimedOut()) return false;
    const voter = this.getPlayer(voterId);
    const target = this.getPlayer(targetId);
    if (!voter || !voter.isAlive()) return false;
    if (!target || !target.isAlive()) return false;
    if (!this.tally.hasVoted(voterId)) return false;
    this.tally.changeVote(voterId, targetId);
    voter.vote = targetId;
    return true;
  }

  getTally() {
    return this.tally.getResults();
  }

  getPublicVotes() {
    if (this.anonymous) return {};
    return { ...this.tally.votes };
  }

  collectAbstentions() {
    return this.players
      .filter((p) => p.isAlive() && !this.tally.hasVoted(p.id))
      .map((p) => p.id);
  }

  endVoting() {
    const results = this.tally.getResults();
    const abstentions = this.collectAbstentions();
    this.phase = 'results';

    const entries = Object.entries(results);
    if (entries.length === 0) {
      return { elected: null, results, abstentions, noVotes: true, tie: false, revote: false };
    }

    const maxVotes = Math.max(...entries.map(([, v]) => v));
    const leaders = entries.filter(([, v]) => v === maxVotes).map(([id]) => Number(id));

    if (leaders.length > 1) {
      let elected = null;
      let revote = false;
      if (this.tieRule === 'random') {
        elected = leaders[Math.floor(Math.random() * leaders.length)];
      } else if (this.tieRule === 'revote') {
        revote = true;
      }
      return {
        elected, results, abstentions, tied: leaders,
        tie: true, tieRule: this.tieRule, revote, noVotes: false,
      };
    }

    return { elected: leaders[0], results, abstentions, tie: false, revote: false, noVotes: false };
  }

  execute(playerId) {
    const player = this.getPlayer(playerId);
    if (!player || !player.isAlive()) return false;
    player.kill();
    this.phase = 'execution';
    return true;
  }

  newRound() {
    this.tally.reset();
    for (const player of this.players) player.vote = null;
    this.phase = 'voting';
    this.elapsed = 0;
    this.round += 1;
  }
}

module.exports = { VoteManager };
