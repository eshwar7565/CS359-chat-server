const mongoose = require("mongoose");
const bcrypt = require("bcryptjs")
const crypto = require("crypto") ;



const userSchema = new mongoose.Schema({

    firstName: {
        type: String,
        required: [true, "First Name is required"],
    },

   
    lastName: {
        type: String,
        required: [true, "Last Name is required"],
    },

    about : {
        type: String,
    
    },
    avatar: {
        type: String,
    },

    email: {
        type: String,
        required: [true, "Email is required"],
        validate: {
            validator: function (email) {
                return String(email)
                    .toLowerCase()
                    .match(
                        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
                    );
            },
            message: (props) => `Email (${props.value}) is invalid!`,
        },
    },

    password: {
        // unselect
        type: String,
    },

    passwordChangedAt: {
        // unselect
        type: Date,
    },

    passwordResetToken: {
        // unselect
        type: String,
    },
    passwordResetExpires: {
        // unselect
        type: Date,
    },

    createdAt: {
        type: Date,
        default: Date.now(),
    },
    updatedAt: {
        // unselect
        type: Date,
    },
    verified :
    {
        type : Boolean ,
        default :false ,
    } ,

    otp:
    {
        type :Number,
    }
    ,
    otp_expiry_time:
    {
        type : Date ,
    }
    ,
    socket_id:
    {
        type :String,
    },
    friends :
    [
       {
            type : mongoose.Schema.ObjectId ,
            ref : "User" ,
       } 
    ]
    ,
    status: {
        type: String,
        enum: ["Online", "Offline"]
      }


});
userSchema.pre("save", async function (next) {

    // Only run this function if password was actually modified
 if (!this.isModified("otp") || !this.otp) return next();

 // Hash the otp with cost of 12
 this.otp = await bcrypt.hash(this.otp.toString(), 12);

 console.log(this.otp.toString(), "FROM PRE SAVE HOOK");

 next();
});



userSchema.methods.correctPassword = async function (
    candidatePassword,
    userPassword
  ) {
    return candidatePassword == userPassword ? 1 : 0 ;
  };

  userSchema.methods.correctOTP = async function (candidateOTP, userOTP) {
    return await bcrypt.compare(candidateOTP, userOTP);
  };

  userSchema.methods.createPasswordResetToken = function () {
    const resetToken = crypto.randomBytes(32).toString("hex");
  
    this.passwordResetToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
  
    this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  
    return resetToken;
  };

  userSchema.methods.changedPasswordAfter = function (JWTTimeStamp) {
    if (this.passwordChangedAt) {
      const changedTimeStamp = parseInt(
        this.passwordChangedAt.getTime() / 1000,
        10
      );
      return JWTTimeStamp < changedTimeStamp;
    }
  
    // FALSE MEANS NOT CHANGED
    return false;
  };

  const User = new mongoose.model("User", userSchema);
  module.exports = User;