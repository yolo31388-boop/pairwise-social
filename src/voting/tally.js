
class Tally {
  constructor() { this.votes = {}; this.weights = {}; }
  hasVoted(voterId) {
    return Object.prototype.hasOwnProperty.call(this.votes, voterId);
  }
  addVote(voterId, targetId, weight = 1) {
    if (this.hasVoted(voterId)) return false;
    this.votes[voterId] = targetId;
    this.weights[voterId] = weight;
    return true;
  }
  changeVote(voterId, targetId) {
    if (!this.hasVoted(voterId)) return false;
    this.votes[voterId] = targetId;
    return true;
  }
  getResults() {
    const results = {};
    for (const [voter, target] of Object.entries(this.votes)) {
      results[target] = (results[target] || 0) + (this.weights[voter] || 1);
    }
    return results;
  }
  reset() { this.votes = {}; this.weights = {}; }
}

module.exports = { Tally };
