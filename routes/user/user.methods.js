const UserModel = require("../../models/user.models");

const {

  getConversationDetails,
  
} = require("../conversation/conversation.methods");


//hàm lấy thông tin của một user
module.exports.getUser = async ({ filter, select }) => {
  const user = await UserModel.findOne(filter).select(select);
  return user;
};

//lấy danh sách bạn bè theo giá trị username - toán tử like
module.exports.getUsers = async ({
  skip = 0,
  limit = 0,
  filter = {},
  select = {},
}) => {
  //select dạng {key: -1} không hoạt động --
  //chuyển qua chuỗi để select "-password -friends" (bỏ password và friends)
  const users = await UserModel.find(filter)
    .skip(skip)
    .limit(limit)
    .select(select);
  return users;
};

//lấy danh sách những người yêu cầu kết bạn
module.exports.getFriendRequests = async ({ skip = 0, limit = 0, _id }) => {
  //tìm của một người nên chỉ cần dùng findOne
  const friendRequests = await UserModel.findOne({ _id })
    .populate({
      path: "friend_request",
      select: "_id username info",
    })
    .skip(skip)
    .limit(limit)
    .select("friend_request");
  console.log(friendRequests);
  return friendRequests;
};

//kiểm tra xem có phải đang là bạn không
module.exports.checkIsFriend = ({ user, contactUser }) => {
  if (user.friends.includes(contactUser._id)) {
    return true;
  }
  return false;
};

//kiểm tra xem người kia có gửi lời mời kết bạn với mình không
module.exports.checkIsFriendRequested = ({ user, contactUser }) => {
  if (user.friend_requested.includes(contactUser._id)) {
    return true;
  }
  return false;
};

//thêm yêu cầu kết bạn
module.exports.addFriendRequest = ({ user, contactUser }) => {
  //nếu chưa gửi lời mời kết bạn cho người này thì thực hiện thêm vào csdl
  if (!user.friend_sent.includes(contactUser._id)) {
    user.friend_sent.unshift(contactUser._id);
    user.friendSentCount += 1; //tăng số lượng

    //đồng thời thêm thông tin vào mảng friend_requested của người kia
    contactUser.friend_requested.unshift(user._id);
    contactUser.friendRequestCount += 1;

    //tạo thông báo và bắn socket io ở đây
  }
};

//xóa bỏ lời yêu cầu kết bạn của một người (contactUser) đối với mình (user)
module.exports.cancelFriendRequested = ({ user, contactUser }) => {
  //nếu người đó đã gửi lời mời thì mới thực hiện việc xóa
  if (user.friend_requested.includes(contactUser._id)) {
    user.friend_requested.pull({ _id: contactUser._id });
    user.friendRequestCount -= 1; //giảm số lượng
  } else {
    throw new Error("ERROR_FRIEND_REQUESTED_NOT_FOUND");
  }
  //xóa bỏ mình trong mảng sent của người kia
  if (contactUser.friend_sent.includes(user._id)) {
    this.cancelFriendSent({ user: contactUser, contactUser: user });
  }
};

//xóa bỏ một yêu cầu kết bạn của mình (user) cho người kia (contactUser)
module.exports.cancelFriendSent = ({ user, contactUser }) => {
  //nếu mình đã gửi lời mời kết bạn cho người kia thì xóa
  if (user.friend_sent.includes(contactUser._id)) {
    user.friend_sent.pull({ _id: contactUser._id });
    user.friendSentCount -= 1; //giảm số lượng
  } else {
    throw new Error("ERROR_FRIEND_SENT_NOT_FOUND");
  }
  //xóa luôn mình trong danh requested của bạn
  if (contactUser.friend_requested.includes(user._id)) {
    this.cancelFriendRequested({ user: contactUser, contactUser: user });
  }
};

//theo dõi người dùng
module.exports.followUser = ({ user, contactUser }) => {
  //kiểm tra đã follow chưa rồi mới thêm
  if (!user.following.includes(contactUser._id)) {
    user.following.unshift(contactUser._id);
    user.followingCount += 1;

    //thêm follower cho người dùng kia
    contactUser.followers.unshift(user._id);
    contactUser.followerCount += 1;
  }
};

//hủy theo dõi người dùng
module.exports.unFollowUser = ({ user, contactUser }) => {
  //kiểm tra đã follow chưa rồi mới xóa
  if (user.following.includes(contactUser._id)) {
    user.following.pull(contactUser._id);
    user.followingCount -= 1;

    //xóa follower cho người dùng kia
    contactUser.followers.pull(user._id);
    contactUser.followerCount -= 1;
  }
};

//chấp nhận bạn bè
module.exports.acceptFriend = ({ user, contactUser }) => {
  //thêm _id của nhau vào mảng friends - thêm vào đầu mảng là hợp lý nhất
  user.friends.unshift(contactUser._id);
  user.friendCount += 1;

  contactUser.friends.unshift(user._id);
  contactUser.friendCount += 1;

  //gọi hàm hủy tất cả các yêu cầu liên quan đến lời mời kết bạn
  //vì giờ 2 đây 2 người đã là bạn bè
  this.cancelFriendRequested({ contactUser, user });

  //gọi hàm theo dõi cho cả 2
  this.followUser({ user, contactUser });
  this.followUser({ user: contactUser, contactUser: user });

  //tạo phòng chat giữa 2 bên

  //dùng io thông báo
};

//hủy bạn bè
module.exports.cancelFriend = ({ user, contactUser }) => {
  //xóa ra khỏi danh sách bạn bè
  user.friends.pull(contactUser._id);
  user.friendCount -= 1;
  contactUser.friends.pull(user._id);
  contactUser.friendCount -= 1;

  //hủy theo dõi giữa cả 2 bên
  this.unFollowUser({ user, contactUser });
  this.unFollowUser({ user: contactUser, contactUser: user });
};

//lấy danh sách các subdocument liên quan đến friends theo path (friends, friend_requested, friend_sent)
module.exports.fetchFriendsSubdocuments = async ({
  filter = {},
  _id,
  path,
  skip,
  limit,
  displayName,
 
}) => {

  let matchSubQuery = {
    "informations.displayName": {
      //chọn ra những displayName có kí tự giống với giá trị displayName search
      $regex: displayName,
    },
  }
 

  const list = await UserModel.findOne({ _id, ...filter })

    .populate({
      path: path,
      match: {
        ...matchSubQuery,
      },
      populate: {
        path: "avatar",
        populate: "files",
        select: "files",
      },
      select: "_id informations avatar",
    })

    .select(path)

    //dùng để slice để skip và limit cho subdocument
    .slice(path, [Number.parseInt(skip), Number.parseInt(limit)]);

  return list;
};

//lấy danh sách người dùng cho phần tags - chỉ lấy bạn bè của một người dùng
//tags: mảng các _id người dùng
//friends: mảng các _id người dùng là bạn bè của một người
//displayName: giá trị để tìm theo tên
module.exports.fetchFriends = async ({ skip = 0, limit = 10, filter, select = "_id informations avatar" }) => {
  // console.log(displayName);
  const list = await UserModel.find(filter)
    .populate({
      path: "avatar",
      populate: "files",
      select: "files",
    })
    .skip(Number.parseInt(skip))
    .limit(Number.parseInt(limit))
    .select(select);

  return list;
};

module.exports.fetchFriendsWithConversation = async ({
  userId,
  skip = 0,
  limit = 10,
  displayName,
}) => {
  const friendsData = await this.fetchFriends({
    skip,
    limit,
    filter: {
      friends: { $in: [userId] },
      "informations.displayName": {
        $regex: displayName,
      },
    },
  });

  const friendsResult = [];

  //với mỗi friend - ta tìm kiếm kiếm _id conversation tương ứng giữa ta và friend đó
  for (let i = 0; i < friendsData.length; i++) {
    const friend = friendsData[i];
    const conversation = await getConversationDetails({
      filter: {
        users: { $all: [userId.toString(), friend._id.toString()] },
        type: "individual",
      },
      select: "_id",
    });

    if(!conversation){
      console.log(friend)
    }

    friendsResult.push({
      ...friend._doc,
      conversationId: conversation._id,
    });
  }

  return friendsResult;
};
