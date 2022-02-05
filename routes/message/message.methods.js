const MessageModel = require("../../models/message.models");

//tạo một tin nhắn
module.exports.createMessage = async ({
  owner,
  conversation,
  type,
  file, //_id của một file ta tạo
  text,
}) => {
  let toCreate = { conversation, type, file, text };
  //nếu tin nhắn không phải của hệ thống thì mới thêm giá trị owner vào
  if (type !== "system") {
    toCreate = { ...toCreate, owner };
  }
  const message = new MessageModel(toCreate);
  await message.save();
  await message
    .populate({
      path: "owner",
      populate: {
        path: "avatar",
        populate: "files",
        select: "files",
      },
      select: "_id avatar informations",
    })
    //url là một field chứa các thông tin về file
    .populate("file")
    .execPopulate();
  return message;
};

//fetch các tin nhắn
module.exports.fetchMessages = async ({
  filter,
  skip = 0,
  limit = 10,
  select = "",
}) => {
  const messages = await MessageModel.find(filter)
    .populate({
      path: "owner",
      populate: {
        path: "avatar",
        populate: "files",
        select: "files",
      },
      select: "_id avatar informations",
    })
    //url là một field chứa các thông tin về file
    .populate("file")
    .skip(Number.parseInt(skip))
    .limit(Number.parseInt(limit))
    .sort({ createdAt: -1 })
    .select(select);

 
  return messages;
};
