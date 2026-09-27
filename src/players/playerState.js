
const DEFAULT_VOTE_WEIGHTS = {
  sheriff: 2,
  mayor: 2,
  villager: 1,
};

class PlayerState {
  constructor(id) {
    this.id = id;
    this.alive = true;
    this.vote = null;
    this.role = 'villager';
  }

  // 警长/村长等特殊角色拥有额外投票权重
  getVoteWeight() {
    if (!this.alive) return 0;
    if (this.role === 'sheriff' || this.role === 'mayor') {
      return DEFAULT_VOTE_WEIGHTS.sheriff;
    }
    return 1;
  }

  kill() {
    this.alive = false;
    this.vote = null;
  }
}

module.exports = { PlayerState };
