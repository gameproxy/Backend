const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.mentionUser = functions.database.ref("users/{uid}/chat/mentions/{mentionID}").onWrite(async function(change, context) {
    var uid = context.params.uid;
    var mention = change.after.val();

    console.log("[Mention] " + mention.from + " (" + mention.fromuser + ") mentioned UID " + uid + "saying: " + mention.message);

    var deviceTokens = await admin.database().ref("users/" + uid + "/chat/tokens");
    
    if (!deviceTokens.hasChildren()) {
        console.log("    - No devices to send notification to.");
    } else {
        console.log("    - Sending to available devices: " + deviceTokens.numChildren());

        var notificationPayload = {
            notification: {
                title: mention.fromuser + " mentioned you!",
                body: mention.message
            }
        };

        var deviceTokensArray = Object.keys(deviceTokens.val());
        var notificationResponse = await admin.messaging().sendToDevice(deviceTokensArray, notificationPayload);
        var badDeviceTokens = [];

        notificationResponse.forEach(function(result, index) {
            var error = result.error;
            
            if (error) {
                console.warn("    - A bad token has been found, and it may be removed due to error: ", error.code);

                if (error.code == "messaging/invalid-registration-token" || error.code == "messaging/registration-token-not-registered") {
                    badDeviceTokens.push(deviceTokens.ref.child(deviceTokensArray[index]).remove());
                }
            }
        });

        return Promise.all(tokensToRemove);
    }
});