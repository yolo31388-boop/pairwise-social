
class SocialSystem:
    def __init__(self):
        self.friends = {}
        self.requests = {}
        self.blocked = {}
        self.groups = {}

    def send_request(self, from_pid, to_pid):
        if to_pid not in self.requests:
            self.requests[to_pid] = []
        self.requests[to_pid].append({"from": from_pid, "time": 0})
        return True

    def accept_request(self, pid, from_pid):
        if pid in self.requests:
            for r in self.requests[pid]:
                if r["from"] == from_pid:
                    if pid not in self.friends:
                        self.friends[pid] = []
                    if from_pid not in self.friends:
                        self.friends[from_pid] = []
                    self.friends[pid].append(from_pid)
                    # BUG: 不双向
                    return True
        return False

    def block(self, pid, target):
        if pid not in self.blocked:
            self.blocked[pid] = []
        self.blocked[pid].append(target)
        return True

    def can_send_request(self, from_pid, to_pid):
        # BUG: 不检查被拉黑
        return True

    def remove_friend(self, pid, target):
        if pid in self.friends and target in self.friends[pid]:
            self.friends[pid].remove(target)
        # BUG: 不双向移除
        return True
