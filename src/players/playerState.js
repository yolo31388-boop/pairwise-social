
class PlayerState {
  constructor(id) { this.id=id; this.alive=true; this.vote=null; this.role='villager'; }
}

module.exports = { PlayerState };
