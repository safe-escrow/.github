const { SES } = require("@aws-sdk/client-ses");
const simpleParser = require('mailparser').simpleParser;

async function parseMime(mimeMessage) {
  try {
    const parsed = await simpleParser(mimeMessage);
    return parsed;
  } catch (err) {
    console.error("Error parsing MIME message:", err);
    throw err;
  }
}

exports.handler = async function (event, context, callback) {
    console.log('Support Auto-Reply invoked as Lambda Action -- this function is designed to run directly off the receipt');

    var sesNotification = JSON.parse(event.Records[0].Sns.Message);
    console.log("SES Notification:\n", JSON.stringify(sesNotification));

    var from = sesNotification.mail.commonHeaders.from[0];
    var to = sesNotification.mail.commonHeaders.to[0];
    var replyTo = sesNotification.mail.commonHeaders.replyTo[0];
    var subject = `Support Auto Response RE: ${sesNotification.mail.commonHeaders.subject}`;
    var messageId = sesNotification.mail.commonHeaders.messageId.replace("@amazon.com", "");
    var sender = (process.env.DefaultEmail!=null && process.env.DefaultEmail != "") ? process.env.DefaultEmail : to;
    var recipient = replyTo ;

    var content = Buffer.from(sesNotification.content, 'base64').toString("utf-8");
    var body_html = '';

    await parseMime(content)
        .then(parsedMessage => {
            // Access parsed data:
            body_html = parsedMessage.html;
        })
        .catch(err => {
            console.error("Error parsing MIME message:", err);
        });

    var charset = "UTF-8";
    var ses = new SES();
    var params = {
        Source: sender,
        Destination: {
            ToAddresses: [
                recipient
            ],
        },
        Message: {
            Subject: {
                Data: subject,
                Charset: charset
            },
            Body: {
                Html: {
                    Data: body_html == null ? '' : body_html,
                    Charset: charset
                }
            }
        },
    };

    ses.sendEmail(params, function (err, data) {
        if (err) {
            console.log(err.message);
        }
        else {
            console.log("Email sent! Message ID: ", data.MessageId);
        }
    });
    console.log('Responding for support email.');
    callback(null, null);
};
