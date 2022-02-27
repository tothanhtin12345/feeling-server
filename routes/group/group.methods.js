//code của mình
const GroupModel = require("../../models/group.models");

//một biến chứa thông tin để populate
const coverPopulate = {
  path: "cover",
  populate: "files",
  select: "files",
};

//một biến chứa thông tin để popluate cho path member
const membersPopulate = {
  path: "members",
  populate: {
    //populate ra avatar của members
    path: "avatar",
    populate: "files",
    select: "files",
  },
  select: "_id informations avatar",
};

//fetch danh sách nhóm theo điều kiện
module.exports.fetchGroups = async ({
  skip = 0,
  limit = 10,
  filter = {},
  select = "",
  //dùng để search
  displayName = "",
  lastId,
}) => {
  //lấy danh sách nhóm cần phải lấy được đủ các thông tin về: ảnh bìa, tên nhóm

  if (lastId) {
    filter = {
      ...filter,
      _id: { $lt: lastId },
    };
  }

  const list = await GroupModel.find({
    "informations.displayName": {
      $regex: displayName,
    },
    ...filter,
  })
    .populate({ path: "cover", populate: "files", select: "files" })

    .skip(Number.parseInt(skip))
    .limit(Number.parseInt(limit))
    //lấy từ ngày mới nhất trở xuống
    .sort({ createdAt: -1, _id: -1 })
    .select(select);

  const newList = list.map((item) => {
    return {
      ...item._doc,
      groupId: item._id,
      //ta tạo một biến avatar cho nhóm là chính ảnh bìa -- dùng để hiển thị avtar khi ở dạng danh sách
      avatar: item._doc.cover,
    };
  });

  return newList;
};

//fetch danh sách nhóm với thông tin chi tiết của chủ nhân nhóm
module.exports.fetchGroupsWithGroupOwnerDetail = async ({
  skip = 0,
  limit = 10,
  filter = {},
  select = "",
  //dùng để search
  displayName = "",
}) => {
  //lấy danh sách nhóm cần phải lấy được đủ các thông tin về: ảnh bìa, tên nhóm

  const list = await GroupModel.find({
    "informations.displayName": {
      $regex: displayName,
    },
    ...filter,
  })
    .populate({ path: "groupOwner", select: "informations _id" })

    .skip(Number.parseInt(skip))
    .limit(Number.parseInt(limit))
    //lấy từ ngày mới nhất trở xuống
    .sort({ createdAt: -1 })
    .select(select);

  const newList = list.map((item) => {
    return {
      ...item._doc,
      groupId: item._id,
      //ta tạo một biến avatar cho nhóm là chính ảnh bìa -- dùng để hiển thị avtar khi ở dạng danh sách
      avatar: item._doc.cover,
    };
  });

  return newList;
};

//thêm một nhóm mới
module.exports.addGroup = async (displayName, description, userId) => {
  //ba thông tin khởi đầu là tên nhóm, mô tả của nhóm và người thành lập nhóm
  //đồng thời - thêm luôn thành viên đầu tiên chính là người tạo nhóm
  const newGroup = new GroupModel({
    informations: { displayName, description },
    groupOwner: userId,
    members: [userId],
    //thiết lập luôn số lượng thành viên là 1
    memberCount: 1,
  });

  await newGroup.save();

  return newGroup;
};

//lấy chi tiết của một nhóm
module.exports.getGroupDeatails = async ({
  filter = {},
  select = "",
  membersSkip = 0,
  membersLimit = 5,
}) => {
  const groupDetails = await GroupModel.findOne(filter)
    //populate ảnh bìa
    .populate(coverPopulate)
    //populate members
    .populate(membersPopulate)

    .select(select);

  if (!groupDetails) {
    throw new Error("ERROR_NOT_FOUND");
  }

  return groupDetails;
};

//lấy những dữ liệu liên quan đến user của group
module.exports.fetchUsersSubDocumentInGroup = async ({
  filter = {},
  groupId,
  path,
  skip,
  limit,
  displayName,
  slicePath = null,
}) => {
  let pathToSlice = path;
  if (slicePath !== null) {
    pathToSlice = slicePath;
  }

  const list = await GroupModel.findOne({ _id: groupId, ...filter })

    .populate({
      path: path,
      match: {
        "informations.displayName": {
          //chọn ra những displayName có kí tự giống với giá trị displayName search
          $regex: displayName,
        },
      },
      populate: {
        path: "avatar",
        populate: "files",
        select: "files",
      },
      select: "_id informations avatar",
    })

    .select(pathToSlice)

    //dùng để slice để skip và limit cho subdocument
    .slice(pathToSlice, [Number.parseInt(skip), Number.parseInt(limit)]);

  return list;
};

//kiểm tra xem - một người có phải đã gửi yều cầu tham gia nhóm không
module.exports.checkIsRequested = ({ userId, requestedMembers }) => {
  let isRequested = requestedMembers.find(
    (item) => item._id.toString() === userId.toString()
  );
  return isRequested;
};
