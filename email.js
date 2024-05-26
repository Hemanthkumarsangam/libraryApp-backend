const nodemailer = require('nodemailer')
require('dotenv').config()

const transporter = nodemailer.createTransport({
    service : 'gmail',
    auth : {
        user : process.env.MAIL,
        pass : process.env.PASS
    }
})

function sendMail(subject, message, to){
    const mailOptions = {
        from : process.env.MAIL,
        to : to,
        subject : subject,
        html : `<hmtl><head></head><body><p>${message}</p></body></hmtl>`
    }

    transporter.sendMail(mailOptions, function(error, info){
        if (error) {
            console.log('Error sending email:', error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
}

function sendRequestMail(subject, message){
    const mailOptions = {
        from : process.env.MAIL,
        to : process.env.MAIL,
        subject : subject,
        html : `<hmtl>
                    <head></head>
                    <body>
                        <p>${message}</p>
                        <br><br><br>
                        <a href = ${process.env.ADMIN}><button id='grantBtn'>Go to Admin page</button></a>
                    </body>
                </hmtl>`
    }

    transporter.sendMail(mailOptions, function(error, info){
        if (error) {
            console.log('Error sending email:', error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
}

module.exports = {sendMail, sendRequestMail}
