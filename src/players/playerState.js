
const SPECIAL_WEIGHT = 2;
const SPECIAL_ROLES = new Set(['sheriff', 'mayor']);

class PlayerState {
  constructor(id) { this.id=id; this.alive=true; this.vote=null; this.role='villager'; }
  isAlive() { return this.alive === true; }
  voteWeight() { return SPECIAL_ROLES.has(this.role) ? SPECIAL_WEIGHT : 1; }
  kill() { this.alive = false; this.vote = null; }
}

module.exports = { PlayerState };
