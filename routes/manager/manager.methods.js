const primaryIsoDateString = "-01-01T00:00:00.000Z";
module.exports.createGraphAggregate = (year) => {
    //xác định nằm tiếp theo
    const nextYear = parseInt(year) + 1;
    //giải thích:
    //ta sẽ lấy ra dữ liệu từng tháng trong 1 năm
    // để xét 1 năm ta sẽ tính dữ liệu từ đầu năm (tức là >= năm đang xét)
    // và đến cuối năm (< năm kế)
    // và việc kiểm tra này sẽ được thực hiện trong mongo - do đó, ta phải chuyển về string
  
    const startYearISODateString = year + primaryIsoDateString;
    const nextYearISODateString = nextYear + primaryIsoDateString;
    return [
      {
        //xét điều kiện
        $match: {
          //chỉ lấy ra dữ liệu ở trong 1 năm ví dụ: 2020 thì createdAt phải >= 2020 và <2021
          $and: [
            {
              //thời gian bắt đầu từ năm hiện tại (>=)
              createdAt: { $gte: new Date(startYearISODateString) },
            },
            {
              //và bé hơn năm tiếp theo (<)
              createdAt: { $lt: new Date(nextYearISODateString) },
            },
          ],
        },
      },
      {
        //tạo thêm cột dữ liệu
        $project: {
          // lấy ra tháng từ dữ liệu createdAt và tạo cột month để chứa dữ liệu
          month: { $month: "$createdAt" },
        },
      },
      {
        //nhóm
        $group: {
          //nhóm các dữ liệu theo cột month (mới tạo ở project)
          _id: "$month",
          //và đếm số lượng mỗi nhóm rồi gán vào viến monthCount
          count: {$sum: 1},
        },
      },
    ];
  };
  module.exports.createMonthData = (data) => {
    const monthData = [
      { month: 1, value: 0 },
      { month: 2, value: 0 },
      { month: 3, value: 0 },
      { month: 4, value: 0 },
      { month: 5, value: 0 },
      { month: 6, value: 0 },
      { month: 7, value: 0 },
      { month: 8, value: 0 },
      { month: 9, value: 0 },
      { month: 10, value: 0 },
      { month: 11, value: 0 },
      { month: 12, value: 0 },
    ];
  
    //dữ liệu chỉ có 12 cột và chỉ kiểm tra điều kiện đơn giản nên ta chạy 2 vòng lặp cũng không gây ảnh nhiều đến hiệu suất
    monthData.forEach((i) => {
      data.forEach((j) => {
        //nếu tìm thấy tháng trong dữ liệu data thì gán giá trị value = giá trị count
        if (i.month === j._id) {
          i.value = j.count;
        }
      });
    });
    return monthData;
  };