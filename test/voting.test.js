
const { VoteManager } = require('../src/voting/voteManager.js');
const { PlayerState } = require('../src/players/playerState.js');

describe('社交推理投票', () => {
  test('每人一票', () => {
    const p1 = new PlayerState(1); const p2 = new PlayerState(2);
    const vm = new VoteManager([p1, p2]);
    vm.castVote(1, 2);
    expect(vm.castVote(1, 1)).toBe(false);
  });
  test('重复投票被拒', () => {
    const p1 = new PlayerState(1); const p2 = new PlayerState(2);
    const vm = new VoteManager([p1, p2]);
    vm.castVote(1, 2);
    expect(vm.tally.votes[1]).toBe(2);
  });
  test('投票给死者被拒', () => {
    const p1 = new PlayerState(1); const p2 = new PlayerState(2);
    p2.alive = false;
    const vm = new VoteManager([p1, p2]);
    expect(vm.castVote(1, 2)).toBe(false);
  });
  test('平票处理', () => {
    const p1 = new PlayerState(1); const p2 = new PlayerState(2); const p3 = new PlayerState(3);
    const vm = new VoteManager([p1, p2, p3]);
    vm.castVote(1, 2);
    vm.castVote(2, 3);
    const result = vm.endVoting();
    expect(result.tie).toBe(true);
  });
  test('超时弃权', () => {
    const p1 = new PlayerState(1);
    const vm = new VoteManager([p1]);
    vm.elapsed = 61;
    expect(vm.isTimedOut()).toBe(true);
  });
  test('更改投票', () => {
    const p1 = new PlayerState(1); const p2 = new PlayerState(2); const p3 = new PlayerState(3);
    const vm = new VoteManager([p1, p2, p3]);
    vm.castVote(1, 2);
    vm.changeVote(1, 3);
    expect(vm.tally.votes[1]).toBe(3);
  });
  test('匿名投票隐藏', () => {
    const vm = new VoteManager([]);
    vm.anonymous = true;
    expect(vm.getPublicVotes()).toEqual({});
  });
  test('特殊角色权重', () => {
    const p1 = new PlayerState(1); p1.role = 'sheriff';
    const p2 = new PlayerState(2);
    const vm = new VoteManager([p1, p2]);
    vm.castVote(1, 2);
    const results = vm.tally.getResults();
    expect(results[2]).toBe(2);
  });
  test('得票统计正确', () => {
    const p1 = new PlayerState(1); const p2 = new PlayerState(2); const p3 = new PlayerState(3);
    const vm = new VoteManager([p1, p2, p3]);
    vm.castVote(1, 3); vm.castVote(2, 3);
    const results = vm.tally.getResults();
    expect(results[3]).toBe(2);
  });
  test('处决更新状态', () => {
    const p1 = new PlayerState(1); const p2 = new PlayerState(2);
    const vm = new VoteManager([p1, p2]);
    vm.castVote(1, 2);
    const result = vm.endVoting();
    vm.execute(result.elected);
    expect(p2.alive).toBe(false);
  });
  test('多轮独立计票', () => {
    const p1 = new PlayerState(1); const p2 = new PlayerState(2);
    const vm = new VoteManager([p1, p2]);
    vm.castVote(1, 2);
    vm.endVoting();
    vm.newRound();
    expect(Object.keys(vm.tally.votes).length).toBe(0);
  });
  test('全弃权处理', () => {
    const p1 = new PlayerState(1);
    const vm = new VoteManager([p1]);
    const result = vm.endVoting();
    expect(result.noVotes).toBe(true);
  });

  test('未投票玩家被计为弃权', () => {
    const p1 = new PlayerState(1); const p2 = new PlayerState(2); const p3 = new PlayerState(3);
    const vm = new VoteManager([p1, p2, p3]);
    vm.castVote(1, 2);
    const result = vm.endVoting();
    expect(result.abstentions).toEqual(expect.arrayContaining([2, 3]));
    expect(result.abstentions).toHaveLength(2);
  });

  test('重复投票第二次被拒且只计一票', () => {
    const p1 = new PlayerState(1); const p2 = new PlayerState(2); const p3 = new PlayerState(3);
    const vm = new VoteManager([p1, p2, p3]);
    expect(vm.castVote(1, 2)).toBe(true);
    expect(vm.castVote(1, 3)).toBe(false);
    expect(vm.getTally()[2]).toBe(1);
    expect(vm.getTally()[3]).toBeUndefined();
  });

  test('已死亡玩家不能投票', () => {
    const p1 = new PlayerState(1); const p2 = new PlayerState(2);
    p1.alive = false;
    const vm = new VoteManager([p1, p2]);
    expect(vm.castVote(1, 2)).toBe(false);
    expect(Object.keys(vm.tally.votes)).toHaveLength(0);
  });

  test('投票给已死亡玩家被拒且不进计票', () => {
    const p1 = new PlayerState(1); const p2 = new PlayerState(2); const p3 = new PlayerState(3);
    p3.alive = false;
    const vm = new VoteManager([p1, p2, p3]);
    expect(vm.castVote(1, 3)).toBe(false);
    expect(vm.castVote(2, 3)).toBe(false);
    expect(vm.getTally()).toEqual({});
  });

  test('平票触发重新投票规则', () => {
    const p1 = new PlayerState(1); const p2 = new PlayerState(2); const p3 = new PlayerState(3); const p4 = new PlayerState(4);
    const vm = new VoteManager([p1, p2, p3, p4], { tieRule: 'revote' });
    vm.castVote(1, 3); vm.castVote(2, 3);
    vm.castVote(3, 4); vm.castVote(4, 4);
    const result = vm.endVoting();
    expect(result.tie).toBe(true);
    expect(result.revote).toBe(true);
    expect(result.elected).toBeNull();
  });

  test('平票触发随机处决规则', () => {
    const p1 = new PlayerState(1); const p2 = new PlayerState(2); const p3 = new PlayerState(3); const p4 = new PlayerState(4);
    const vm = new VoteManager([p1, p2, p3, p4], { tieRule: 'random' });
    vm.castVote(1, 3); vm.castVote(2, 3);
    vm.castVote(3, 4); vm.castVote(4, 4);
    const result = vm.endVoting();
    expect(result.tie).toBe(true);
    expect([3, 4]).toContain(result.elected);
  });

  test('平票默认无人处决', () => {
    const p1 = new PlayerState(1); const p2 = new PlayerState(2); const p3 = new PlayerState(3); const p4 = new PlayerState(4);
    const vm = new VoteManager([p1, p2, p3, p4]);
    vm.castVote(1, 3); vm.castVote(2, 3);
    vm.castVote(3, 4); vm.castVote(4, 4);
    const result = vm.endVoting();
    expect(result.tie).toBe(true);
    expect(result.elected).toBeNull();
  });

  test('超时后投票被拒绝且超时者按弃权处理', () => {
    const p1 = new PlayerState(1); const p2 = new PlayerState(2);
    const vm = new VoteManager([p1, p2], { timeLimit: 30 });
    vm.tick(31);
    expect(vm.isTimedOut()).toBe(true);
    expect(vm.castVote(1, 2)).toBe(false);
    expect(vm.changeVote(1, 2)).toBe(false);
    const result = vm.endVoting();
    expect(result.abstentions).toEqual(expect.arrayContaining([1, 2]));
  });

  test('更改投票以最后一次为准', () => {
    const p1 = new PlayerState(1); const p2 = new PlayerState(2); const p3 = new PlayerState(3);
    const vm = new VoteManager([p1, p2, p3]);
    vm.castVote(1, 2);
    expect(vm.changeVote(1, 3)).toBe(true);
    expect(vm.tally.votes[1]).toBe(3);
    expect(p1.vote).toBe(3);
    expect(vm.getTally()).toEqual({ 3: 1 });
  });

  test('投票阶段结束后不能更改投票', () => {
    const p1 = new PlayerState(1); const p2 = new PlayerState(2); const p3 = new PlayerState(3);
    const vm = new VoteManager([p1, p2, p3]);
    vm.castVote(1, 2);
    vm.endVoting();
    expect(vm.changeVote(1, 3)).toBe(false);
    expect(vm.tally.votes[1]).toBe(2);
  });

  test('匿名投票隐藏投票者身份但计票不受影响', () => {
    const p1 = new PlayerState(1); const p2 = new PlayerState(2); const p3 = new PlayerState(3);
    const vm = new VoteManager([p1, p2, p3], { anonymous: true });
    vm.castVote(1, 3); vm.castVote(2, 3);
    expect(vm.getPublicVotes()).toEqual({});
    expect(vm.getTally()[3]).toBe(2);
  });

  test('公开投票显示投票关系', () => {
    const p1 = new PlayerState(1); const p2 = new PlayerState(2); const p3 = new PlayerState(3);
    const vm = new VoteManager([p1, p2, p3], { anonymous: false });
    vm.castVote(1, 3); vm.castVote(2, 3);
    expect(vm.getPublicVotes()).toEqual({ 1: 3, 2: 3 });
  });

  test('村长(mayor)投票同样拥有额外权重', () => {
    const p1 = new PlayerState(1); p1.role = 'mayor';
    const p2 = new PlayerState(2); const p3 = new PlayerState(3);
    const vm = new VoteManager([p1, p2, p3]);
    vm.castVote(1, 3);
    expect(p1.voteWeight()).toBe(2);
    expect(vm.getTally()[3]).toBe(2);
  });

  test('普通村民权重为1', () => {
    const p1 = new PlayerState(1);
    expect(p1.voteWeight()).toBe(1);
  });

  test('处决更新存活状态与游戏阶段', () => {
    const p1 = new PlayerState(1); const p2 = new PlayerState(2); const p3 = new PlayerState(3);
    const vm = new VoteManager([p1, p2, p3]);
    vm.castVote(1, 2); vm.castVote(3, 2);
    const result = vm.endVoting();
    expect(result.elected).toBe(2);
    expect(vm.execute(result.elected)).toBe(true);
    expect(p2.alive).toBe(false);
    expect(vm.phase).toBe('execution');
  });

  test('处决后死者在下一轮不能再投票或被投票', () => {
    const p1 = new PlayerState(1); const p2 = new PlayerState(2);
    const vm = new VoteManager([p1, p2]);
    vm.castVote(1, 2);
    vm.endVoting();
    vm.execute(2);
    vm.newRound();
    expect(vm.castVote(2, 1)).toBe(false);
    expect(vm.castVote(1, 2)).toBe(false);
  });

  test('多轮投票独立计票且轮次递增', () => {
    const p1 = new PlayerState(1); const p2 = new PlayerState(2); const p3 = new PlayerState(3);
    const vm = new VoteManager([p1, p2, p3]);
    vm.castVote(1, 2); vm.castVote(2, 2);
    expect(vm.getTally()[2]).toBe(2);
    vm.endVoting();
    vm.newRound();
    expect(vm.round).toBe(2);
    expect(vm.getTally()).toEqual({});
    expect(p1.vote).toBeNull();
    vm.castVote(1, 3); vm.castVote(2, 3);
    expect(vm.getTally()).toEqual({ 3: 2 });
    expect(vm.getTally()[2]).toBeUndefined();
  });

  test('全弃权无人处决且不产生平票', () => {
    const p1 = new PlayerState(1); const p2 = new PlayerState(2);
    const vm = new VoteManager([p1, p2]);
    const result = vm.endVoting();
    expect(result.noVotes).toBe(true);
    expect(result.tie).toBe(false);
    expect(result.elected).toBeNull();
    expect(result.abstentions).toEqual(expect.arrayContaining([1, 2]));
  });
});
