
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

describe('社交推理投票 - 引擎不变量扩展', () => {
  test('每人一票：第二个存活玩家的投票同样被接受，两人票仓各一票', () => {
    const p1 = new PlayerState(1);
    const p2 = new PlayerState(2);
    const p3 = new PlayerState(3);
    const vm = new VoteManager([p1, p2, p3]);
    expect(vm.castVote(1, 3)).toBe(true);
    expect(vm.castVote(2, 3)).toBe(true);
    expect(Object.keys(vm.tally.votes)).toHaveLength(2);
    expect(vm.tally.votes[1]).toBe(3);
    expect(vm.tally.votes[2]).toBe(3);
  });

  test('重复投票被拒：再次投票不改写已记录的票', () => {
    const p1 = new PlayerState(1);
    const p2 = new PlayerState(2);
    const p3 = new PlayerState(3);
    const vm = new VoteManager([p1, p2, p3]);
    vm.castVote(1, 2);
    expect(vm.castVote(1, 3)).toBe(false);
    expect(vm.tally.votes[1]).toBe(2);
    expect(p1.vote).toBe(2);
  });

  test('已死亡投票者不能投票，不存在的玩家也不能投票', () => {
    const p1 = new PlayerState(1);
    const p2 = new PlayerState(2);
    p1.alive = false;
    const vm = new VoteManager([p1, p2]);
    expect(vm.castVote(1, 2)).toBe(false);
    expect(vm.castVote(99, 2)).toBe(false);
    expect(Object.keys(vm.tally.votes)).toHaveLength(0);
  });

  test('投票给不存在的玩家被拒', () => {
    const p1 = new PlayerState(1);
    const vm = new VoteManager([p1]);
    expect(vm.castVote(1, 42)).toBe(false);
    expect(vm.tally.hasVoted(1)).toBe(false);
  });

  test('平票-random：注入随机源确定性地处决平票者之一', () => {
    const p1 = new PlayerState(1);
    const p2 = new PlayerState(2);
    const p3 = new PlayerState(3);
    const vm = new VoteManager([p1, p2, p3], { tieRule: 'random', rng: () => 0.99 });
    vm.castVote(1, 2);
    vm.castVote(2, 3);
    const result = vm.endVoting();
    expect(result.tie).toBe(true);
    expect(result.resolved).toBe('random');
    expect([2, 3]).toContain(result.elected);
    expect(result.elected).toBe(3);
  });

  test('平票-revote：清空票仓进入重新投票阶段，再投可正常处决', () => {
    const p1 = new PlayerState(1);
    const p2 = new PlayerState(2);
    const p3 = new PlayerState(3);
    const vm = new VoteManager([p1, p2, p3], { tieRule: 'revote' });
    vm.castVote(1, 2);
    vm.castVote(2, 3);
    const tieResult = vm.endVoting();
    expect(tieResult.tie).toBe(true);
    expect(vm.phase).toBe('revote');
    expect(Object.keys(vm.tally.votes)).toHaveLength(0);
    vm.castVote(1, 2);
    vm.castVote(2, 2);
    const second = vm.endVoting();
    expect(second.tie).toBe(false);
    expect(second.elected).toBe(2);
  });

  test('平票-none（默认）：无人处决且游戏进入夜晚', () => {
    const p1 = new PlayerState(1);
    const p2 = new PlayerState(2);
    const p3 = new PlayerState(3);
    const vm = new VoteManager([p1, p2, p3]);
    vm.castVote(1, 2);
    vm.castVote(2, 3);
    const result = vm.endVoting();
    expect(result.elected).toBeNull();
    expect(result.resolved).toBe('none');
    expect(vm.phase).toBe('night');
  });

  test('超时弃权：超时后投票被拒，未投票者全部计入弃权名单', () => {
    const p1 = new PlayerState(1);
    const p2 = new PlayerState(2);
    const p3 = new PlayerState(3);
    const vm = new VoteManager([p1, p2, p3], { timeLimit: 30 });
    vm.tick(31);
    expect(vm.isTimedOut()).toBe(true);
    expect(vm.castVote(1, 3)).toBe(false);
    const result = vm.endVoting();
    expect(result.abstentions.sort()).toEqual([1, 2, 3]);
    expect(result.noVotes).toBe(true);
  });

  test('超时部分弃权：已投票正常计入，仅未投票者弃权', () => {
    const p1 = new PlayerState(1);
    const p2 = new PlayerState(2);
    const p3 = new PlayerState(3);
    const vm = new VoteManager([p1, p2, p3], { timeLimit: 30 });
    vm.castVote(1, 3);
    vm.tick(30);
    const result = vm.endVoting();
    expect(result.elected).toBe(3);
    expect(result.abstentions.sort()).toEqual([2, 3]);
  });

  test('更改投票：以最后一次为准，得票统计随之更新', () => {
    const p1 = new PlayerState(1);
    const p2 = new PlayerState(2);
    const p3 = new PlayerState(3);
    const vm = new VoteManager([p1, p2, p3]);
    expect(vm.changeVote(1, 3)).toBe(false);
    vm.castVote(1, 2);
    expect(vm.changeVote(1, 3)).toBe(true);
    expect(vm.tally.votes[1]).toBe(3);
    expect(vm.getTally()[3]).toBe(1);
    expect(vm.getTally()[2]).toBeUndefined();
  });

  test('更改投票不能指向已死亡玩家', () => {
    const p1 = new PlayerState(1);
    const p2 = new PlayerState(2);
    const p3 = new PlayerState(3);
    p3.alive = false;
    const vm = new VoteManager([p1, p2, p3]);
    vm.castVote(1, 2);
    expect(vm.changeVote(1, 3)).toBe(false);
    expect(vm.tally.votes[1]).toBe(2);
  });

  test('匿名投票隐藏身份且匿名模式下无公开投票关系', () => {
    const p1 = new PlayerState(1);
    const p2 = new PlayerState(2);
    const p3 = new PlayerState(3);
    const vm = new VoteManager([p1, p2, p3], { anonymous: true });
    vm.castVote(1, 3);
    vm.castVote(2, 3);
    expect(vm.getPublicVotes()).toEqual({});
    // 计票结果仍可用于处决，不暴露谁投了谁
    expect(vm.getTally()[3]).toBe(2);
  });

  test('公开投票显示完整投票关系', () => {
    const p1 = new PlayerState(1);
    const p2 = new PlayerState(2);
    const p3 = new PlayerState(3);
    const vm = new VoteManager([p1, p2, p3]);
    vm.castVote(1, 3);
    vm.castVote(2, 1);
    expect(vm.getPublicVotes()).toEqual({ 1: 3, 2: 1 });
  });

  test('特殊角色权重：警长票权 2，村长票权 2，普通村民票权 1', () => {
    const sheriff = new PlayerState(1);
    sheriff.role = 'sheriff';
    const mayor = new PlayerState(2);
    mayor.role = 'mayor';
    const p3 = new PlayerState(3);
    expect(sheriff.getVoteWeight()).toBe(2);
    expect(mayor.getVoteWeight()).toBe(2);
    expect(p3.getVoteWeight()).toBe(1);
  });

  test('警长权重可凭一票压过两名平票村民', () => {
    const sheriff = new PlayerState(1);
    sheriff.role = 'sheriff';
    const p2 = new PlayerState(2);
    const p3 = new PlayerState(3);
    const p4 = new PlayerState(4);
    const vm = new VoteManager([sheriff, p2, p3, p4]);
    vm.castVote(1, 4);
    vm.castVote(2, 3);
    vm.castVote(3, 2);
    const result = vm.endVoting();
    expect(result.tie).toBe(false);
    expect(result.elected).toBe(4);
    expect(result.results[4]).toBe(2);
  });

  test('得票统计正确：getTally 与 getTallyReport 都按权重汇总', () => {
    const p1 = new PlayerState(1);
    const p2 = new PlayerState(2);
    const p3 = new PlayerState(3);
    const p4 = new PlayerState(4);
    const vm = new VoteManager([p1, p2, p3, p4]);
    vm.castVote(1, 3);
    vm.castVote(2, 3);
    vm.castVote(3, 4);
    const tally = vm.getTally();
    expect(tally[3]).toBe(2);
    expect(tally[4]).toBe(1);
    const report = vm.getTallyReport();
    expect(report.votes).toEqual({ 1: 0, 2: 0, 3: 2, 4: 1 });
    expect(report.totalVotes).toBe(3);
  });

  test('处决更新状态：当选玩家死亡且阶段推进，重复处决被拒', () => {
    const p1 = new PlayerState(1);
    const p2 = new PlayerState(2);
    const p3 = new PlayerState(3);
    const vm = new VoteManager([p1, p2, p3]);
    vm.castVote(1, 2);
    vm.castVote(2, 2);
    const result = vm.endVoting();
    expect(result.elected).toBe(2);
    expect(vm.execute(3)).toBe(false);
    expect(vm.execute(2)).toBe(true);
    expect(p2.alive).toBe(false);
    expect(vm.phase).toBe('night');
    expect(vm.execute(2)).toBe(false);
  });

  test('多轮独立计票：newRound 后上一轮票数与玩家记录全部清零', () => {
    const p1 = new PlayerState(1);
    const p2 = new PlayerState(2);
    const p3 = new PlayerState(3);
    const vm = new VoteManager([p1, p2, p3]);
    vm.castVote(1, 2);
    vm.castVote(2, 2);
    vm.endVoting();
    vm.newRound();
    expect(Object.keys(vm.tally.votes)).toHaveLength(0);
    expect(vm.getTally()).toEqual({});
    expect(p1.vote).toBeNull();
    expect(vm.round).toBe(2);
    vm.castVote(1, 3);
    vm.castVote(2, 3);
    const result = vm.endVoting();
    expect(result.elected).toBe(3);
    expect(result.results[3]).toBe(2);
  });

  test('全弃权处理：无人投有效票时 noVotes 且无人当选', () => {
    const p1 = new PlayerState(1);
    const p2 = new PlayerState(2);
    const p3 = new PlayerState(3);
    const vm = new VoteManager([p1, p2, p3]);
    expect(vm.abstain(1)).toBe(true);
    const result = vm.endVoting();
    expect(result.noVotes).toBe(true);
    expect(result.elected).toBeNull();
    expect(result.results).toEqual({});
    expect(result.abstentions).toHaveLength(3);
  });

  test('endVoting 幂等：阶段结束后重复调用与投票均不能改变结果', () => {
    const p1 = new PlayerState(1);
    const p2 = new PlayerState(2);
    const p3 = new PlayerState(3);
    const vm = new VoteManager([p1, p2, p3]);
    vm.castVote(1, 3);
    vm.castVote(2, 3);
    const first = vm.endVoting();
    const second = vm.endVoting();
    expect(second).toBe(first);
    expect(vm.castVote(3, 2)).toBe(false);
    expect(vm.changeVote(1, 2)).toBe(false);
  });
});
