const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
//const DoorDashClient = require("ec236271-89c2-47d6-8b6a-dbaaf3db8726/sdk");

admin.initializeApp();
 
//set up the connection token endpoint add it as a enviroment configuration variables
const stripe = require('stripe')('sk_test_51HJRIIG3s6ntMxMfFUlMIIs4z6PcagVqwVjSUwEzhbHFOUrYHOCCIj1JoOsl5v7otYDjVOI5vFXPmWIa0NdePhNF00UhHmKAct');

const app = express();
const { resolve } = require("path");

app.use(express.static("."));
app.use(express.json());


app.use(express.static("."));
app.use(express.json());


var request = require('request');


app.post("/connection_token", async(req, res) => {
    let connectionToken = await stripe.terminal.connectionTokens.create();
    res.json({secret: connectionToken.secret});
  })

app.post('/create_payment_intent', async (req, res) => {
  
  console.log("starts here");
  console.log(res);
  console.log(req);
  const intent = await stripe.paymentIntents.create({
    amount: 1000,
    currency: 'usd',
    payment_method_types: ['card_present'],
    capture_method: 'manual',

  });  res.json({client_secret: intent.client_secret});
});

  app.post("/capture_payment_intent", async(req, res) => {
    const intent = await stripe.paymentIntents.capture(req.body.id);
    res.send(intent);
  })

app.listen(4242, () => console.log('Node server listening on port 250!'));

exports.app = functions.https.onRequest(app);

exports.createStripeCustomer = functions.firestore.document('users/{userId}').onCreate(async (snap, context) => {
    const data = snap.data();
    const email = data.email;
    console.log(email)
    const customer = await stripe.customers.create({ email: email})
    return admin.firestore().collection('users').doc(data.uid).update({ stripeID : customer.id})
});
 

exports.createConnectAccount = functions.https.onCall(async (data, context) => {
    console.log(context.id)
    const account = await stripe.accounts.create({
        country: 'US',
        type: 'express'
      });
      console.log(account.id)
      
      return account.id;
})



exports.createAccountLink = functions.https.onCall(async (data, context) => {
    const accountLinks = await stripe.accountLinks.create({
        account: data.id,
        refresh_url: 'https://example.com/reauth',
        return_url: 'https://example.com/return',
        type: 'account_onboarding',
      });
      console.log(accountLinks)
      return accountLinks;
})


exports.refundMoney = functions.https.onCall(async (data, context) => {
    const refund = await stripe.refunds.create({
        payment_intent: data.paymentIntent,
        amount: data.total
    });
      return refund;
})


exports.createloginLink = functions.https.onCall(async (data, context) => {
    const loginLink = await stripe.accounts.createLoginLink(
        data.id
      );
      return loginLink;
})


exports.retrieveAccount = functions.https.onCall(async (data, context) => {
    const account = await stripe.accounts.retrieve(
        data.id
      );
      return account;
})



exports.createConnectLink = functions.https.onCall(async (data, context) => {

      const link = await stripe.accounts.createLoginLink(
          data.id
          );
      return link;
})

exports.createCustomerConnectLocation = functions.https.onCall(async (data, context) => {
    const customerId = data.customerId;
    const dispayName = data.displayName;
    const street = data.street;
    const city = data.city;
    const state = data.state;
    const postal = data.postal;
    const country = data.country;

    const location = await stripe.terminal.locations.create({
        display_name: dispayName,
        address: {
          line1: street,
          city: city,
          state: state,
          country: country,
          postal_code: postal,
        },
        metadata: {
          connected_account: customerId
        }
      })

})



exports.createCharge = functions.https.onCall(async (data, context) => {
    const customerId = data.customerId;
    const totalAmount = data.total;
    const idempotency = data.idempotency;
    const uid = context.auth.uid

    if (uid === null){  
        throw new functions.https.HttpsError('permission-denied', 'Illegal Access Attempt')
    }

    const paymentIntent = await stripe.paymentIntents.create({
        amount: totalAmount,
        currency: 'usd',
        customer: customerId,
      });
      const clientSecret = paymentIntent.client_secret; 
      return clientSecret;
})








 
exports.createEphemralKey = functions.https.onCall(async (data, context) => {
    const customerID = data.customer_id;
    const stripeVersion = data.stripe_version;
    const uid = context.auth.uid;
   
    if (uid === null){
        console.log('Illegal Access Attempt by unauthenticated User')
        throw new functions.https.HttpsError('permission-denied', 'Illegal Access Attempt')
    }
    return stripe.ephemeralKeys.create(
        {customer: customerID},
        {apiVersion: stripeVersion}
    ).then((key) =>  {
        return key
    }).catch((err) => {
        console.log(err)
        throw new functions.https.HttpsError('internal', 'Unable to create ephermeral key')
    })
})
 

exports.getSubCollections = functions.https.onCall(async (data, context) => {
 
    const docPath = data.docPath;
    console.log(docPath)
    
    //const collections = await admin.firestore().doc(docPath).listCollections();
    //const collectionIds = collections.map(col => col.id);
    return { collections: collectionIds };
 
});


exports.getReservations = functions.https.onCall(async (data, context) => {
 
    var restaurants = admin.firestore().collection('restaurant').get()
        .then(snapshot => {
            snapshot.forEach(doc => {
                console.log(doc.id);
                var rest = admin.firestore().collection('restaurant').document(doc.id).collection('Reservations').get().then(snapshotTime => {
                    snapshotTime.forEach(docTime => {
                        console.log(docTime.id);
                        //const snapshotTime = await doc.collection('Reservations').get()
                        //var map = snapshotTime.docs.map(doc => new Date(doc.id));
                        //console.log("array", '=>', map);
        
                    });
                    return "i made it here"
                })                
                //const snapshotTime = await doc.collection('Reservations').get()
                //var map = snapshotTime.docs.map(doc => new Date(doc.id));
                //console.log("array", '=>', map);

            });
            return "i made it here"
        })
        .catch(err => {
            console.log('Error getting documents', err);
        });
    return null;
 
});

/*
exports.scheduledFunction = functions.pubsub.schedule('0 0 * * *').onRun((context) => {
    var reference = db.collection('restaurant');
    var restaurants = citiesRef.get()
        .then(snapshot => {
            snapshot.forEach(doc => {
                console.log(doc.id, '=>', doc.data());
            });
        })
        .catch(err => {
            console.log('Error getting documents', err);
        });
    return null;
  });
*/

exports.qrScanner = functions.https.onCall(async (data, context) => {
 
    const qrString = data.qrCode;
    const location = (qrString || '').split(" ");
    var dict = "helloooooo";
    console.log(qrString)
    console.log(location)

    if (location.length === 4) {
        const docPath = ('restaurant/' + location[0] + "/" + location[1] + "/" + location[2] + "/seats/" + location[3]);
        dict = await admin.firestore().doc(docPath).get().then(doc => {
            console.log("Exists?: " + doc.exists);
            var dict1 = {
                "exists": doc.exists,
                "menu": location[1]
              };

            console.log("in table?: " + doc.exists);
            console.log(dict1);
            return dict1;

            }).catch(err => {
                console.log('Error getting document', err);
                return "in error";
        });
    }
    else if (location.length === 3 && location[1] === "Takeout" && location[2] === "takeout") {
        const docPathTakeout = ('restaurant/' + location[0] + "/Takeout/takeout");
        dict = await admin.firestore().doc(docPathTakeout).get().then(doc => {
            console.log("Exists?: " + doc.exists);
            var dict2 = {
                "exists": doc.exists,
                "menu": location[1]
              };

            console.log("takeout: " + doc.exists);
            console.log(dict2);
            return dict2;
            
            }).catch(err => {
                console.log('Error getting document', err);
                return "in error";
        });
    }
    else if (location.length === 1) {
        const docPathTakeout = ('restaurant/' + location[0]);
        dict = await admin.firestore().doc(docPathTakeout).get().then(doc => {
            console.log("Exists?: " + doc.exists);
            var dict2 = {
                "exists": doc.exists,
                "menu": location[0]
              };
            console.log(dict2);
            return dict2;
            
            }).catch(err => {
                console.log('Error getting document', err);
                return "in error";
        });
    }
    else {
        return dict;
    }
    return dict;
});





//  exports.helloWorld = functions.https.onRequest((request, response) => {
//    functions.logger.info("Hello logs!", {structuredData: true});
//    console.log('In the console')
//    response.send("Hello from Dayton!");
//  });
 

 