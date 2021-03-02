const pm2 = require('pm2')
const cron = require('node-cron');

pm2.connect((error) => {
    if (error) {
      console.error(error)
    }

    pm2.start({ script: 'index.js' }, (error, apps) => {
      pm2.disconnect()
      if (error) {
        console.error(error)
      }
    })
    
    cron.schedule("*/10  * * * *", function(){
      pm2.restart('index', (error) => {
        if (error) {
          console.error(error)
        }
      })
      console.log('[INFO] Time to restart!');
    })
})