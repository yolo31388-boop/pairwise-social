
const ROLE_WEIGHTS = {
  sheriff: 2,
  mayor: 2,
};

// 每一轮投票独立计票：votes 记录 投票者 -> 目标，results 按角色权重累计得票
class Tally {
  constructor(players = []) {
    this.votes = {};
    this.playerById = new Map();
    for (const player of players) {
      this.playerById.set(String(player.id), player);
    }
  }

  setPlayers(players) {
    this.playerById = new Map();
    for (const player of players) {
      this.playerById.set(String(player.id), player);
    }
  }

  hasVoted(voterId) {
    return Object.prototype.hasOwnProperty.call(this.votes, String(voterId));
  }

  addVote(voterId, targetId) {
    const key = String(voterId);
    // 同一轮内已有有效投票时拒绝再次投票；更改投票必须走 changeVote
    if (Object.prototype.hasOwnProperty.call(this.votes, key)) return false;
    this.votes[key] = targetId;
    return true;
  }

  changeVote(voterId, targetId) {
    const key = String(voterId);
    if (!Object.prototype.hasOwnProperty.call(this.votes, key)) return false;
    this.votes[key] = targetId;
    return true;
  }

  weightFor(voterId) {
    const player = this.playerById.get(String(voterId));
    if (!player || !player.alive) return 1;
    return ROLE_WEIGHTS[player.role] || 1;
  }

  // 按权重统计每个目标玩家的得票数
  getResults() {
    const results = {};
    for (const [voterId, targetId] of Object.entries(this.votes)) {
      const targetKey = String(targetId);
      const player = this.playerById.get(voterId);
      const weight =
        player && player.alive
          ? ROLE_WEIGHTS[player.role] || 1
          : 1;
      results[targetKey] = (results[targetKey] || 0) + weight;
    }
    return results;
  }

  reset() {
    this.votes = {};
  }
}

module.exports = { Tally };
