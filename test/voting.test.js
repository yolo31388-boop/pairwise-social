
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
});
