

class VoteManager {
  constructor(players) { this.players = players; this.tally = new Tally(); this.phase='voting'; this.timeLimit=60; this.elapsed=0; }
  castVote(voterId, targetId) {
    // BUG: 不验证目标是否存活
    this.tally.addVote(voterId, targetId);
    return true;
  }
  endVoting() {
    const results = this.tally.getResults();
    // BUG: 不平票处理
    const max = Math.max(...Object.values(results));
    const elected = Object.keys(results).find(k => results[k] === max);
    return {elected, results};
  }
}

module.exports = { VoteManager };
