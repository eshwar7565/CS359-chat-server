const jwt = require("jsonwebtoken");

const User = require("../models/user");

const filterObj = require("../utils/filterObj");

const signToken = (userId) => jwt.sign({ userId }, process.env.JWT_SECRET);

const token = signToken(user._id);

res.status(200).json({
    status: "success",
    message: "OTP verified Successfully!",
    token,
    user_id: user._id,
});


// Register New User

exports.register = catchAsync(async (req, res, next) => {
    const { firstName, lastName, email, password } = req.body;

    const filteredBody = filterObj(
        req.body,
        "firstName",
        "lastName",
        "email",
        "password"
    );

    // check if a verified user with given email exists

    const existing_user = await User.findOne({ email: email });

    if (existing_user && existing_user.verified) {
        // user with this email already exists, Please login
        return res.status(400).json({
            status: "error",
            message: "Email already in use, Please login.",
        });
    } else if (existing_user) {
        // if not verified than update prev one

        await User.findOneAndUpdate({ email: email }, filteredBody, {
            new: true,
            validateModifiedOnly: true,
        });

        // generate an otp and send to email
        req.userId = existing_user._id;
        next();
    } else {
        // if user is not created before than create a new one
        const new_user = await User.create(filteredBody);

        // generate an otp and send to email
        req.userId = new_user._id;
        next();
    }

});


// User Login
exports.login = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;

    // console.log(email, password);

    if (!email || !password) {
        res.status(400).json({
            status: "error",
            message: "Both email and password are required",
        });
        return;
    }

    const user = await User.findOne({ email: email }).select("+password");

    if (!user || !user.password) {
        res.status(400).json({
            status: "error",
            message: "Incorrect password",
        });

        return;
    }


});


exports.sendOTP = catchAsync(async (req, res, next) => {
    const { userId } = req;
    const new_otp = otpGenerator.generate(6, {
        upperCaseAlphabets: false,
        specialChars: false,
        lowerCaseAlphabets: false,
    });

    const otp_expiry_time = Date.now() + 10 * 60 * 1000; // 10 Mins after otp is sent

    const user = await User.findByIdAndUpdate(userId, {
        otp_expiry_time: otp_expiry_time,
    });

    user.otp = new_otp.toString();

    await user.save({ new: true, validateModifiedOnly: true });

    console.log(new_otp);

    // TODO send mail
    // mailService.sendEmail({
    //   from: "eshwarrachakonda02@gmail.com",
    //   to: user.email,
    //   subject: "Verification OTP",
    //   html: otp(user.firstName, new_otp),
    //   attachments: [],
    // });

    res.status(200).json({
        status: "success",
        message: "OTP Sent Successfully!",
    });
});


exports.verifyOTP = catchAsync(async (req, res, next) => {
    // verify otp and update user accordingly
    const { email, otp } = req.body;
    const user = await User.findOne({
      email,
      otp_expiry_time: { $gt: Date.now() },
    });
  
    if (!user) {
      return res.status(400).json({
        status: "error",
        message: "Email is invalid or OTP expired",
      });
    }
  
    if (user.verified) {
      return res.status(400).json({
        status: "error",
        message: "Email is already verified",
      });
    }
  
    if (!(await user.correctOTP(otp, user.otp))) {
      res.status(400).json({
        status: "error",
        message: "OTP is incorrect",
      });
  
      return;
    }
  
    // OTP is correct
  
    user.verified = true;
    user.otp = undefined;
    await user.save({ new: true, validateModifiedOnly: true });
  
    const token = signToken(user._id);
  
    res.status(200).json({
      status: "success",
      message: "OTP verified Successfully!",
      token,
      user_id: user._id,
    });
  });