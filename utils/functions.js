


//mảng trả về phần tử id chung ở mảng
//tham khảo ở: https://www.codespeedy.com/get-common-elements-from-two-arrays-in-javascript/
module.exports.getIdsCommon = (idsArr1, idsArr2) => {
  let common = []; 
  for (var i = 0; i < idsArr1.length; ++i) {
    for (var j = 0; j < idsArr2.length; ++j) {
      if (idsArr1[i].toString() == idsArr2[j].toString()) {
        // If element is in both the arrays
        common.push(idsArr1[i]); // Push to common array
      }
    }
  }

  return common;
};
