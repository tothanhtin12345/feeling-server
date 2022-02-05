const createError = require("http-errors");
const mongoose = require("mongoose");

//code của mình
const GroupModel = require("../../models/group.models");
const FileModel = require("../../models/file.models");
const PostModel = require("../../models/post.models");
const CommentModel = require("../../models/comment.models");
const {
  addGroup,
  fetchGroups,
  getGroupDeatails,
  fetchUsersSubDocumentInGroup,
  checkIsRequested,
} = require("./group.methods");

const { removeFile, removeFileFromDB } = require("../file/file.methods");

const {
  createNotificationForGroup,
  createNotificationForUser,
} = require("../notification/notification.methods");

const UserModel = require("../../models/user.models");

const { fetchFriends } = require("../user/user.methods");

//độ dài giới hạn của mô tả
const maxDescriptionLength = 100;

//lấy danh sách nhóm đang quản lý
module.exports.fetchGroupsManagingHandler = async (req, res, next) => {
  try {
    const { displayName, skip = 0, limit = 10, lastId, } = req.query;
    const { _id } = req.user;
    //ta sẽ tìm những nhóm mà người dùng đã tạo ra (xem xét thêm là quản lý có bao gồm luôn những người kiểm duyệt không ?)
    const filter = {
      groupOwner: _id,
    };

    const groupsList = await fetchGroups({
      skip,
      limit,
      displayName,
      filter,
      select: "informations cover memberCount",
      lastId,
    });

    return res.status(200).json({
      groups: groupsList,
    });
  } catch (err) {
    console.log(err);
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

//lấy dánh sách nhóm đang tham gia
module.exports.fetchGroupsJoiningHandler = async (req, res, next) => {
  try {
    const { displayName, skip = 0, limit = 10, lastId } = req.query;
    const { _id } = req.user;

    //ta sẽ tìm ra những group có members là mình
    const filter = {
      members: { $in: [_id] },
    };
    const groupsList = await fetchGroups({
      skip,
      limit,
      displayName,
      filter,
      select: "informations cover groupOwner memberCount",
      lastId,
    });

    const listResult = groupsList.map((item) => {
      return {
        ...item,
        //tách riêng là thuộc tính này để ở dưới client dễ dùng
        groupId: item._id,
        isManager: item.groupOwner.toString() === _id.toString(),
      };
    });

    return res.status(200).json({
      groups: listResult,
    });
  } catch (err) {
    console.log(err);
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

//lấy danh sách nhóm đã gửi yêu cầu tham gia (nhưng chưa được chấp thuận)
module.exports.fetchGroupsSentdHandler = async (req, res, next) => {
  try {
    const { displayName, skip = 0, limit = 10, lastId } = req.query;
    const { _id } = req.user;

    //ta sẽ tìm ra những group có requestedMembers là mình
    const filter = {
      "requestedMembers._id": { $in: [_id] },
    };
    const groupsList = await fetchGroups({
      skip,
      limit,
      displayName,
      filter,
      select: "informations cover",
      lastId,
    });

    return res.status(200).json({
      groups: groupsList,
    });
  } catch (err) {
    console.log(err);
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

//tạo một nhóm mới
module.exports.addGroupHandler = async (req, res, next) => {
  try {
    const { groupName: displayName, groupDes: description } = req.body;

    //kiểm tra trước phần description
    if (description && description.length > maxDescriptionLength) {
      console.log(description.length);
      return next(createError(400, "GROUP_DESCRIPTION_MAX"));
    }

    //tạo mới group
    const newGroup = await addGroup(displayName, description, req.user._id);

    return res.status(200).json({
      group: newGroup._doc,
    });
  } catch (err) {
    console.log(err);
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

//lấy thông tin chi tiết của một nhóm
module.exports.getGroupDetailsHandler = async (req, res, next) => {
  try {
    const { id } = req.query;
    const user = req.user;

    const filter = {
      _id: id,
    };

    const groupDetailsRaw = await getGroupDeatails({
      filter,
      select: "",
      membersLimit: 5,
      membersSkip: 0,
    });

    const groupDetails = groupDetailsRaw._doc;

    //lấy ra tên nhóm (done)
    //mô tả (done)
    //số lượng thành viên (done)
    //lấy trước khoảng 5 thành viên (done)
    //ngày thành lập (done)
    //privary: private (done)
    groupDetails.privacy = "private";

    //có tham gia chưa ?
    //members đã được populate
    let isMember = false;

    //nếu người dùng là admin thì có thể xem người dùng là một member của nhóm
    if (user.role === "admin") {
      isMember = true;
    }
    //ngược lại thì phải kiểm tra
    else {
      const membersLength = groupDetails.members.length;

      for (let i = 0; i < membersLength; i++) {
        const member = groupDetails.members[i];
        if (member._id.toString() === user._id.toString()) {
          isMember = true;
          break;
        }
      }
    }

    //có phải đang chờ xác nhận không ?
    //requestedMembers chưa được populate nên nó vẫn là một mảng _id
    let isSent = false;
    //gọi hàm kiểm tra xem có phải đã gủi yêu cầu không
    let isRequested = checkIsRequested({
      requestedMembers: groupDetails.requestedMembers,
      userId: user._id,
    });
    if (isRequested) {
      isSent = true;
    }

    //có phải quản lý không ? (người tạo nhóm hoặc admin)
    let isManager =
      groupDetails.groupOwner.toString() === user._id.toString() ||
      user.role == "admin";

    //có phải người kiểm duyệt hay không ?
    let isInspector = groupDetails.inspectors.includes(user._id);

    return res.status(200).json({
      group: {
        ...groupDetails,
        ...groupDetails.informations,
        isMember,
        isManager,
        isSent,
        isInspector,
      },
    });
  } catch (err) {
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

//update thông tin (tên và mô tả) của nhóm
module.exports.updateGroupInformationsHandler = async (req, res, next) => {
  try {
    const { groupId, groupName: displayName, groupDes: description } = req.body;
    const { groupDetails } = res.locals;

    //kiểm tra trước phần description
    if (description && description.length > maxDescriptionLength) {
      console.log(description.length);
      return next(createError(400, "GROUP_DESCRIPTION_MAX"));
    }

    //tiến hành cập nhật
    groupDetails.informations = {
      displayName,
      description,
    };

    await groupDetails.save();

    return res.status(200).json({
      groupId,
      data: {
        informations: groupDetails.informations,
        //trả về riêng lẻ 2 giá trị để cập nhật cho các phần khác
        displayName,
        description,
      },
    });
  } catch (err) {
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

//update cover của nhóm
module.exports.updateGroupCoverHandler = async (req, res, next) => {
  try {
    const { groupId } = req.body;
    const { imagePost, groupDetails } = res.locals;

    //lấy ra cái id của file vừa upload - và chuyển trạng thái public của nó thành false trong csdl để không hiển thị lên tường nhà
    //files này đã được xử lý và lưu trong req.body
    const { files } = req.body;
    const fileId = files[0]._id;
    await FileModel.findOneAndUpdate({ _id: fileId }, { public: false });

    groupDetails.cover = imagePost._id;
    await groupDetails.save();
    return res.status(200).json({
      imagePost: {
        ...imagePost._doc,
        isOwner: true,
      },
      groupId,
    });
  } catch (err) {
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

//gửi yêu cầu tham gia nhóm
module.exports.joinGroupRequestHandler = async (req, res, next) => {
  try {
    const { groupId } = req.body;
    const { groupDetails } = res.locals;
    const { _id: userId } = req.user;

    //nếu đang là thành viên thì báo lỗi
    if (groupDetails.members.includes(userId)) {
      return next(createError(400, "ERROR_JOIN_IS_MEMBER"));
    }

    //nếu đã gửi yêu cầu rồi thì cũng báo lỗi
    let isRequested = checkIsRequested({
      requestedMembers: groupDetails.requestedMembers,
      userId,
    });
    if (isRequested) {
      return next(createError(400, "ERROR_JOIN_GROUP_REQUESTED"));
    }

    //nếu không có lỗi thì thêm dữ liệu vào mảng yêu cầu tham gia
    groupDetails.requestedMembers.push({ _id: userId });
    groupDetails.requestedMemberCount += 1;

    await groupDetails.save();

    return res.status(200).json({
      groupId,
      //đánh dấu isSent: true để cập nhật lại dưới UI là người dùng đã gửi yêu cầu tham gia vào nhóm rồi
      data: {
        isSent: true,
      },
    });
  } catch (err) {
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

//hủy yêu cầu tham gia nhóm
module.exports.cancelJoinGroupRequestHandler = async (req, res, next) => {
  try {
    const { groupId } = req.body;
    const { groupDetails } = res.locals;
    const { _id: userId } = req.user;

    //nếu chưa gửi yêu cầu thì  báo lỗi
    let isRequested = checkIsRequested({
      requestedMembers: groupDetails.requestedMembers,
      userId,
    });
    if (!isRequested) {
      return next(createError(400, "ERROR_CANCEL_JOIN_NOT_SEND"));
    }

    //xóa dữ liệu của người đó ra khỏi mảng yêu cầu
    groupDetails.requestedMembers.pull({ _id: userId });
    groupDetails.requestedMemberCount -= 1;

    await groupDetails.save();

    return res.status(200).json({
      groupId,
      //đánh dấu isSent: false để cập nhật lại dưới UI là người dùng chưa gửi yêu cầu tham gia vào nhóm
      data: {
        isSent: false,
      },
    });
  } catch (err) {
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

//lấy danh sách những người đã gửi yêu cầu tham gia nhóm
module.exports.fetchJoinGroupRequestList = async (req, res, next) => {
  try {
    const { groupId, skip = 0, limit = 10, displayName } = req.query;
    //lấy ra một số thông tin được gắn ở middlewares
    // const { isInspector, isManager, isAdmin} = res.locals;
    const { _id } = req.user;

    // gọi hàm lấy ra group kèm các thông tin subdocument (tùy thuộc vào path)
    // những thông tin này đã được skip, limit và populate ra các phần cần thiết
    const joinGroupRequestListData = await fetchUsersSubDocumentInGroup({
      groupId,
      skip,
      limit,
      path: "requestedMembers._id",
      displayName,
    });

    const dataList = joinGroupRequestListData.requestedMembers;

    //gắn thêm thông tin
    final_list = [];
    dataList.forEach((item) => {
      final_list.push({
        //một đối tượng trong mảng requestedMembers sẽ bao gồm _id chứa id của user
        // và requestedAt: thời gian mà user yêu cầu tham gia
        // do đó, ta phải populate requestedMembers._id để lấy thông tin mỗi user
        // nên thằng _id sau khi populate sẽ chứa thông tin của user
        ...item._id._doc,
        requestedAt: item.requestedAt,

        //ta gắn thêm groupId - để tiện cho phía UI có thể tương tác dễ hơn
        groupId,
      });
    });

    console.log(final_list);

    return res.status(200).json({
      joinGroupRequestList: final_list,
    });
  } catch (err) {
    console.log(err);
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

//chấp nhận yêu cầu tham gia nhóm
module.exports.acceptJoinGroupRequestHandler = async (req, res, next) => {
  try {
    const { groupId, userId } = req.body;
    const { groupDetails } = res.locals;
    //người dùng có yêu cầu tham gia chưa ? (chưa có thì báo lỗi - vì chưa yêu cầu thì làm chấp nhận ???)

    let isRequested = checkIsRequested({
      requestedMembers: groupDetails.requestedMembers,
      userId,
    });
    if (!isRequested) {
      return next(createError(400, "ERROR_USER_NOT_REQUEST"));
    }
    //nếu đã yêu cầu thì ta sẽ xóa người dùng trong mảng requestedMembers
    groupDetails.requestedMembers.pull({ _id: userId });
    groupDetails.requestedMemberCount -= 1;
    //và ta thêm người dùng vào mảng members
    groupDetails.members.push(userId);
    groupDetails.memberCount += 1;

    await groupDetails.save();

    //gửi một thông báo cho người dùng
    const notification = await createNotificationForGroup({
      //id người nhận thông báo chính là user được mình chấp nhận
      userId,
      groupDetails,
      type: "group-accept",
      url: `/groups/${groupId}`,
      content: `Lời yêu cầu tham gia vào nhóm <b>${groupDetails.informations.displayName}</b> của bạn đã được chấp nhận.`,
    });

    //lấy ra người dùng đó
    const acceptedUser = await UserModel.findOne({ _id: userId });
    //tăng số lượng thông báo chưa đọc của người dùng này lên 1
    acceptedUser.unReadNotificationCount += 1;
    await acceptedUser.save();

    //bắn socket cái thông báo

    //gửi cho người dùng được accept một thông báo là đã chấp nhận
    res.locals.io.emit(`${userId}-group-notification`, {
      notification: notification._doc,
    });

    return res.status(200).json({
      groupId,
      userId,
      message: "Accept is successful",
    });
  } catch (err) {
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

//từ chối yêu cầu tham gia nhóm
module.exports.denyJoinGroupRequestHandler = async (req, res, next) => {
  try {
    const { groupId, userId } = req.body;
    const { groupDetails } = res.locals;

    //người dùng có yêu cầu tham gia chưa ? (chưa có thì báo lỗi - vì chưa yêu cầu thì làm sao từ chối ???)
    let isRequested = checkIsRequested({
      requestedMembers: groupDetails.requestedMembers,
      userId,
    });
    if (!isRequested) {
      return next(createError(400, "ERROR_USER_NOT_REQUEST"));
    }

    //nếu đã yêu cầu thì ta sẽ xóa người dùng trong mảng requestedMembers
    groupDetails.requestedMembers.pull({ _id: userId });
    groupDetails.requestedMemberCount -= 1;

    await groupDetails.save();

    //trả về userId  và groupId

    return res.status(200).json({
      groupId,
      userId,
      message: "Deny is successful",
    });
  } catch (err) {
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

//lấy danh sách members
module.exports.fetchMembersHandler = async (req, res, next) => {
  try {
    const { groupId, skip, limit, displayName } = req.query;

    const { groupDetails } = res.locals;
    const { _id: userId } = req.user;
    //lấy danh sách thành viên của nhóm
    // gọi hàm lấy ra group kèm các thông tin subdocument (tùy thuộc vào path)
    // những thông tin này đã được skip, limit và populate ra các phần cần thiết
    const joinGroupRequestListData = await fetchUsersSubDocumentInGroup({
      groupId,
      skip,
      limit,
      path: "members",
      displayName,
    });
    const dataList = joinGroupRequestListData.members;

    //duyệt lại từng dữ liệu members
    const newDataList = dataList.map((mem) => {
      return {
        ...mem._doc,
        //có phải member này chính là người dùng hiện tại không ?
        isCurrentUser: mem._id.toString() === userId.toString(),

        //có phải member này là một người kiểm duyệt không ?
        isInspector: groupDetails.inspectors.includes(mem._id),
        //có phải member này là một manager hay không ?
        isManager: groupDetails.groupOwner.toString() === mem._id.toString(),
        //thêm groupId để sử dụng dễ dàng hơn ở phần UI
        groupId,
      };
    });

    return res.status(200).json({
      members: newDataList,
    });
  } catch (err) {
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

//ủy quyền inspector cho một người
module.exports.setInSpectorHandler = async (req, res, next) => {
  try {
    const { groupId, userId } = req.body;

    const { groupDetails } = res.locals;

    //kiểm tra xem - người đó có phải là inspector chưa ?
    if (groupDetails.inspectors.includes(userId)) {
      return next(createError(400, "ERROR_IS_INSPECTOR_ALREADY"));
    }

    //nếu chưa thì mới set (bằng cách thêm vào)
    groupDetails.inspectors.push(userId);
    await groupDetails.save();

    //gửi thông báo cho người được ủy quyền
    //gửi một thông báo cho người dùng
    const notification = await createNotificationForGroup({
      //id người nhận thông báo chính là user được mình chấp nhận
      userId,
      groupDetails,
      type: "group-set-inspector",
      url: `/groups/${groupId}`,
      content: `Bạn đã được bổ nhiệm làm người kiểm duyệt tại nhóm <b>${groupDetails.informations.displayName}</b>.`,
    });

    //lấy ra người dùng đó
    const user = await UserModel.findOne({ _id: userId });
    //tăng số lượng thông báo chưa đọc của người dùng này lên 1
    user.unReadNotificationCount += 1;
    await user.save();

    //bắn socket cái thông báo

    //gửi cho người dùng được accept một thông báo là đã chấp nhận
    res.locals.io.emit(`${userId}-group-notification`, {
      notification: notification._doc,
    });

    return res.status(200).json({
      userId,
      groupId,
      data: { isInspector: true },
    });
  } catch (err) {
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

//hủy quyền inspector của một người dùng
module.exports.unSetInSpectorHandler = async (req, res, next) => {
  try {
    const { groupId, userId } = req.body;

    const { groupDetails } = res.locals;

    //kiểm tra xem - người đó có phải là inspector chưa ?
    if (!groupDetails.inspectors.includes(userId)) {
      return next(createError(400, "ERROR_IS_INSPECTOR_YET"));
    }

    //nếu đã là inspector thì xóa nó ra khỏi mảng
    groupDetails.inspectors.pull(userId);
    await groupDetails.save();

    //gửi thông báo cho người bị hủy quyền
    //gửi một thông báo cho người dùng
    const notification = await createNotificationForGroup({
      //id người nhận thông báo chính là user được mình chấp nhận
      userId,
      groupDetails,
      type: "group-un-set-inspector",
      url: `/groups/${groupId}`,
      content: `Quyền kiểm duyệt của bạn tại nhóm <b>${groupDetails.informations.displayName}</b> đã bị hủy bỏ.`,
    });

    //lấy ra người dùng đó
    const user = await UserModel.findOne({ _id: userId });
    //tăng số lượng thông báo chưa đọc của người dùng này lên 1
    user.unReadNotificationCount += 1;
    await user.save();

    //bắn socket cái thông báo

    //gửi cho người dùng được accept một thông báo là đã chấp nhận
    res.locals.io.emit(`${userId}-group-notification`, {
      notification: notification._doc,
    });

    return res.status(200).json({
      userId,
      groupId,
      data: {
        isInspector: false,
      },
    });
  } catch (err) {
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

//mời một người ra khỏi nhóm
module.exports.dissmissMemberHandler = async (req, res, next) => {
  try {
    const { groupId, userId } = req.body;

    const { groupDetails } = res.locals;

    //kiểm tra xem người đó có phải member trong nhóm không ?
    if (!groupDetails.members.includes(userId)) {
      return next(createError(400, "ERROR_NOT_MEMBER"));
    }

    //kiểm tra quyền và xóa quyền
    if (groupDetails.inspectors.includes(userId)) {
      groupDetails.inspectors.pull(userId);
    }

    //xóa khỏi list members và giảm count
    groupDetails.members.pull(userId);
    groupDetails.memberCount -= 1;

    await groupDetails.save();

    //return
    return res.status(200).json({
      groupId,
      userId,
    });
  } catch (err) {
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

//tìm kiếm người dùng để thêm vào nhóm
module.exports.searchUserToInviteToGroupHandler = async (req, res, next) => {
  try {
    const {
      groupId,
      usersChosenId = [],
      skip = 0,
      limit = 10,
      displayName = "",
    } = req.body;

    const { groupDetails } = res.locals;

    const { friends } = req.user;

    //lấy ra danh sách id thành viên của nhóm
    const members = groupDetails.members;

    //lấy ra danh sách người dùng nào đã gửi lời mời tham gia nhóm
    let requestedMembers = groupDetails.requestedMembers;
    //chỉ lấy ra mảng _id của những người đã yêu cầu tham gia
    requestedMembers = requestedMembers.map((item) => item._id);

    //ta sẽ tìm những người dùng nào:

    //và search theo giá trị displayName
    const filter = {
      //lấy các người dùng có _id thuộc mảng friends
      // và không có trong mảng tags
      _id: {
        // là bạn của người dùng (dựa vào mảng friends)
        $in: friends,
        // chưa tham gia vào nhóm (không có trong members)
        // không có trong mảng usersChosenId
        // không có trong mảng requestedMembers (tức là chưa gửi yêu cầu tham gia)
        // xài $and bị lỗi ==> giải pháp là gộp members và usersChosenId thành 1 sau đó dùng với $nin
        $nin: [...members, ...usersChosenId, ...requestedMembers],
      },
      "informations.displayName": {
        $regex: displayName,
      },
    };

    //nhận được một mảng kết quả
    const result = await fetchFriends({
      skip,
      limit,
      filter,
    });

    return res.status(200).json({
      groupId,
      users: result,
    });
  } catch (err) {
    console.log(err);
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

//thực hiện mời bạn
module.exports.inviteUserToGroupHandler = async (req, res, next) => {
  try {
    const { groupId, usersChosenId = [] } = req.body;

    const user = req.user;

    const { groupDetails } = res.locals;

    //lấy ra danh sách id thành viên của nhóm
    const members = groupDetails.members;

    //lấy ra danh sách id người dùng nào đã gửi lời mời tham gia nhóm
    const requestedMembers = groupDetails.requestedMembers;

    //duyệt từng giá trị trong mảng usersChosenId
    let n = usersChosenId.length;
    const usersInvited = [];
    for (let i = 0; i < n; i++) {
      //nếu mà người dùng được mời không có trong mảng members và requestedMembers
      // thì mới thực hiện mời
      // lưu ý là: ta không xem đây là một lỗi
      // bởi vì có thể do có nhiều người cùng mời hoặc người dùng vào nhóm ngay khi người dùng mời hay người dùng đã gửi yêu cầu tham gia rồi
      // nên ta phải kiểm tra trước khi thêm - nếu thỏa thì chỉ cần thêm vào - khogno thì thôi

      const userChosenId = usersChosenId[i];

     
      let isRequested = checkIsRequested({
        requestedMembers: groupDetails.requestedMembers,
        userId:userChosenId,
      });

      if (
        !members.includes(userChosenId) &&
        !isRequested
      ) {
        //thêm vào mảng requestedMembers
        groupDetails.requestedMembers.push({_id:userChosenId});
        groupDetails.requestedMemberCount += 1;

        //lưu lại id của những người đã được mời thành công
        usersInvited.push(userChosenId);
      }
    }

    //lưu dữ liệu
    await groupDetails.save();

    //duyệt từng giá trị trong usersInvited để tạo và gửi thông báo
    let m = usersInvited.length;
    for (let i = 0; i < m; i++) {
      console.log(usersInvited);

      const userChosenId = usersInvited[i];
      const notification = await createNotificationForUser({
        user,
        contactUser: { _id: userChosenId },
        type: "group-invite",
        url: `/groups/${groupId}`,
        content: `${user.informations.displayName} đã mời bạn tham gia nhóm <b>${groupDetails.informations.displayName}</b>.`,
      });

      //lấy ra người dùng đó
      const userChosen = await UserModel.findOne({ _id: userChosenId });
      //tăng số lượng thông báo chưa đọc của người dùng này lên 1
      userChosen.unReadNotificationCount += 1;
      await userChosen.save();

      //bắn socket cái thông báo

      //gửi cho người dùng được accept một thông báo
      res.locals.io.emit(`${userChosenId}-group-notification`, {
        notification: notification._doc,
      });
    }

    return res.status(200).json({
      code: "SUCCESS_INVITE_USER",
    });
  } catch (err) {
    console.log(err);
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

//thực hiện rời khỏi nhóm
module.exports.outGroupHandler = async (req, res, next) => {
  try {
    const { groupId } = req.body;
    const { groupDetails } = res.locals;
    const { _id } = req.user;
    //nếu người dùng là isManager thì không cho phép out

    if (groupDetails.groupOwner.toString() === _id.toString()) {
      return next(createError(400, "ERROR_OUT_GROUP_IS_MANAGER"));
    }

    //out
    groupDetails.members.pull(_id);
    groupDetails.memberCount -= 1;

    //neeueus đang là inSpector thì xóa ra khỏi quyền luôn
    if (groupDetails.inspectors.includes(_id)) {
      groupDetails.inspectors.pull(_id);
    }

    await groupDetails.save();

    return res.status(200).json({
      groupId,
      data: {
        userId: _id,
        isMember: false,
      },
    });
  } catch (err) {
    console.log(err);
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

//xóa nhóm
module.exports.deleteGroupHandler = async (req, res, next) => {
  try {
    const { groupDetails } = res.locals;

    const groupId = groupDetails._id;
    const members = groupDetails.members;

    //nếu lượng thành viên bé hơn 10 thì mới có thể xóa
    // bởi vì nếu ta nghĩ đến trường hợp thực tế
    // một nhóm nhiều người thì có nghĩa là nhóm đó có thể đang hoạt động ổn
    // và sẽ có nhiều dữ liệu trong nhóm đó
    // vì vậy, không có lý do để người quản trị có thể xóa một cái đang hoạt động ổn cả
    // do đó, ta chỉ có những nhóm có khoảng 10 người - vì khả năng cao nhóm này sẽ ít hoạt động
    // và người quản trị nhóm sẽ có thể không quan tâm đến nó nữa
    if (members.length > 10) {
      return next(createError(400, "ERROR_GROUP_LARGE_MEMBERS"));
    }

    //lấy ra các bài post của nhóm
    const posts = await PostModel.find({ group: groupId }).select("_id files");

    //duyệt từng bài post
    for (let i = 0; i < posts.length; i++) {
      const post = posts[i];

      //lấy ra các files của bài post
      const files = post.files;

      //đi xóa từng file
      for (let j = 0; j < files.length; j++) {
        //các item của filesToDelete đang ở dạng chuỗi json
        //ta chuyển nó thành đôi tượng json
        const file = files[j];

        //xóa file ở storage
        removeFile(file.path);
        const filter = { _id: file._id };
        //xóa file ở bảng File
        await removeFileFromDB({ filter });
      }

      //xóa các comments thuộc về bài post
      await CommentModel.deleteMany({ post: post._id });
    }

    //xóa các bài post
    const resulft = await PostModel.deleteMany({
      group: mongoose.Types.ObjectId(groupId),
    });

    console.log(resulft);

    // xóa nhóm dựa theo _id của nhóm
    await GroupModel.findOneAndDelete({ _id: groupId });

    //duyệt mỗi member

    for (let i = 0; i < members.length; i++) {
      const userId = members[i];
      //gửi một thông báo cho người dùng
      const notification = await createNotificationForGroup({
        //id người nhận thông báo chính là user được mình chấp nhận
        userId,
        groupDetails,
        type: "group-delete",
        url: `/groups/dashboard/joining`,
        content: `Nhóm <b>${groupDetails.informations.displayName}</b> mà bạn đang tham gia đã bị giải tán.`,
      });

      //lấy ra người dùng đó
      const user = await UserModel.findOne({ _id: userId });
      //tăng số lượng thông báo chưa đọc của người dùng này lên 1
      user.unReadNotificationCount += 1;
      await user.save();

      //bắn socket
      res.locals.io.emit(`${userId}-group-notification`, {
        notification: notification._doc,
      });
    }

    return res.status(200).json({
      code: "SUCCESS",
    });

    // tạo thông báo và bắn socket cho các thành viên trong nhóm
  } catch (err) {
    console.log(err);
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};


