const nodemailer = require("nodemailer");

const option = {
  service: "gmail",
  auth: {
    user: "feelingApplication@gmail.com",
    pass: "Anhyeuem123",
  },
};

const transporter = nodemailer.createTransport(option);

module.exports.sendMail = ({ to, subject, text, html }) => {
  return new Promise((resolve, reject) => {
    transporter.verify((err, success) => {
      if (err) {
        reject(err);
      } else {
        const mail = {
          from: "feelingApplication@gmail.com",
          to,
          subject,
          text,
          html,
        };
        transporter.sendMail(mail, (err, info) => {
          if (err) {
            reject(err);
          } else {
            // console.log(info.response);
            resolve(info.response);
          }
        });
      }
    });
  });
};


