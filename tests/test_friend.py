
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from social.friend import SocialSystem


def test_request_timeout():
    ss = SocialSystem()
    ss.send_request("p1", "p2")
    ss.requests["p2"][0]["time"] = 0
    ss.process_expired_requests(now=1000000)
    assert len(ss.requests.get("p2", [])) == 0


def test_block_prevents_request():
    ss = SocialSystem()
    ss.block("p2", "p1")
    assert ss.can_send_request("p1", "p2") == False


def test_friendship_bidirectional():
    ss = SocialSystem()
    ss.send_request("p1", "p2")
    ss.accept_request("p2", "p1")
    assert "p1" in ss.friends.get("p2", [])
    assert "p2" in ss.friends.get("p1", [])


def test_remove_friend_bidirectional():
    ss = SocialSystem()
    ss.send_request("p1", "p2")
    ss.accept_request("p2", "p1")
    ss.remove_friend("p1", "p2")
    assert "p2" not in ss.friends.get("p1", [])
    assert "p1" not in ss.friends.get("p2", [])


def test_online_notify_throttle():
    ss = SocialSystem()
    ss.friends["p1"] = ["p2"]
    notifs = []
    ss.on_player_online("p2", lambda p: notifs.append(p))
    ss.on_player_online("p2", lambda p: notifs.append(p))  # 短时间重复
    assert len(notifs) == 1


def test_party_invite_expiry():
    ss = SocialSystem()
    invite = ss.create_party_invite("p1", "p2")
    invite["expire_at"] = 0
    assert ss.accept_party_invite("p2", invite["id"]) == False


def test_message_read_receipt():
    ss = SocialSystem()
    msg = ss.send_message("p1", "p2", "hello")
    assert msg["read"] == False
    ss.mark_read("p2", msg["id"])
    assert msg["read"] == True


def test_group_synced():
    ss = SocialSystem()
    ss.set_group("p1", "friend", "raid")
    # 换设备后分组应保留（存在服务端）
    assert ss.get_group("p1", "friend") == "raid"


def test_duplicate_request_ignored():
    ss = SocialSystem()
    ss.send_request("p1", "p2")
    ss.send_request("p1", "p2")
    assert len(ss.requests["p2"]) == 1
