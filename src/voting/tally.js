
class Tally {
  constructor() { this.votes = {}; }
  addVote(voterId, targetId) {
    // BUG: 允许重复投票
    this.votes[voterId] = targetId;
  }
  getResults() {
    const results = {};
    for (const target of Object.values(this.votes)) {
      results[target] = (results[target] || 0) + 1;
    }
    return results;
  }
}

module.exports = { Tally };
