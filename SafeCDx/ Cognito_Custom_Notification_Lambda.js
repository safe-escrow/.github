const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { CognitoIdentityProviderClient, DescribeUserPoolClientCommand } = require("@aws-sdk/client-cognito-identity-provider");

exports.handler = async (event) => {
    try {
        //Get the Cognito App Client Name
        const cognitoClient = new CognitoIdentityProviderClient({});

        const appClientId = event.callerContext.clientId;
        const userPoolId = event.userPoolId;

        const cognitoCommand = new DescribeUserPoolClientCommand({
            UserPoolId: userPoolId,
            ClientId: appClientId,
        });

        const response = await cognitoClient.send(cognitoCommand);
        const appClientName = response.UserPoolClient.ClientName;
        console.log('App Client Name:', appClientName);

        // Set the S3 bucket to obtain the email templates from
        const bucketName =  `safecdx-${process.env.env_name}-templates`;
        console.log('bucketName - ' + bucketName);

        // Get the workspace for which email template is requested from the cognito app client name.
        const workspace = appClientName.replace("-client", "");
        console.log('workspace - ' + workspace);

        // Access the 'locale' attribute for the user
        const language = event.request.userAttributes.locale;
        console.log('language - ' + language);

        // Determine the email template subject and body key
        let templateBodyKey;
        let templateSubjectKey;

        console.log(event.triggerSource);

        switch (event.triggerSource) {
            case 'CustomMessage_SignUp':
                templateSubjectKey = `${workspace}/${language}/email/SIGNUP_EMAIL_TEMPLATE-SUBJECT.txt`;
                templateBodyKey = `${workspace}/${language}/email/SIGNUP_EMAIL_TEMPLATE-BODY.html`;
                break;
            case 'CustomMessage_ResendCode':
                templateSubjectKey = `${workspace}/${language}/email/RESEND_CODE_EMAIL_TEMPLATE-SUBJECT.txt`;
                templateBodyKey = `${workspace}/${language}/email/RESEND_CODE_EMAIL_TEMPLATE-BODY.html`;
                break;
            case 'CustomMessage_ForgotPassword':
                templateSubjectKey = `${workspace}/${language}/email/FORGOT_PASSWORD_EMAIL_TEMPLATE-SUBJECT.txt`;
                templateBodyKey = `${workspace}/${language}/email/FORGOT_PASSWORD_EMAIL_TEMPLATE-BODY.html`;
                break;
            default:
                break;
        }

        // Initialize S3 Client
        const s3Client = new S3Client({ region: process.env.AWS_REGION });

        // Get the email Subject
        const subjectData = await s3Client.send(new GetObjectCommand({Bucket: bucketName, Key: templateSubjectKey}));
        let emailSubject = await subjectData.Body.transformToString();
        
        // Get the email Message
        const messageData = await s3Client.send(new GetObjectCommand({Bucket: bucketName, Key: templateBodyKey}));
        let emailMessage = await messageData.Body.transformToString();
        
        // Replace placeholders
        if (event.request.codeParameter) {
            emailMessage = emailMessage.replace('{####}', event.request.codeParameter);
        }
        if (event.userName) {
            emailMessage = emailMessage.replace('{userName}', event.userName);
        }

        console.log("Email Subject:", emailSubject);
        console.log("Email Message:", emailMessage);

        event.response.emailSubject = emailSubject;
        event.response.emailMessage = emailMessage;

        return event;

    } catch (error) {
        console.error('Error retrieving email template from S3:', error);
        throw error; // Re-throw to indicate a failure to Cognito
    }
};
