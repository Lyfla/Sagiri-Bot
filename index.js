const { create, Client } = require('@open-wa/wa-automate')
const figlet = require('figlet')
const options = require('./utils/options')
const { color, messageLog } = require('./utils')
const HandleMsg = require('./HandleMsg')
const fs = require('fs-extra')
const setting = JSON.parse(fs.readFileSync('./settings/setting.json'))
let { 
    ownerNumber, 
    groupLimit, 
    memberLimit,
    prefix,
    restartState: isRestart,
} = setting

const start = (sagiri = new Client()) => {
    console.log(color(figlet.textSync('----------------', { horizontalLayout: 'default' })))
    console.log(color(figlet.textSync('Sagiri', { font: 'Ghost', horizontalLayout: 'default' })))
    console.log(color(figlet.textSync('----------------', { horizontalLayout: 'default' })))
    console.log(color('[DEV]'), color('Lyfla', 'yellow'))
    console.log(color('[~>>]'), color('Ganbatte Oniichan!', 'green'))
    console.log(color('[~>>]'), color('Sukida yo', 'green'))

    // Mempertahankan sesi agar tetap nyala
    sagiri.onStateChanged((state) => {
        console.log(color('[~>>]', 'red'), state)
        if (state === 'CONFLICT' || state === 'UNLAUNCHED') sagiri.forceRefocus()
    })

    // ketika bot diinvite ke dalam group
    sagiri.onAddedToGroup(async (chat) => {
	const groups = await sagiri.getAllGroups()
	// kondisi ketika batas group bot telah tercapai,ubah di file settings/setting.json
	//if (groups.length > groupLimit) {
	await sagiri.sendText(chat.id, `Etto.. Gomenasai, Bot ini *Private*`).then(() => {
	      sagiri.leaveGroup(chat.id)
	      sagiri.deleteChat(chat.id)
	  }) 
	/*} else {
	// kondisi ketika batas member group belum tercapai, ubah di file settings/setting.json
	    if (chat.groupMetadata.participants.length < memberLimit) {
	    await sagiri.sendText(chat.id, `Etto.. Gomenasai, Member di group ini tidak mencukupi, Minimal: ${memberLimit} Member`).then(() => {
	      sagiri.leaveGroup(chat.id)
	      sagiri.deleteChat(chat.id)
	    })
	    } else {
        await sagiri.simulateTyping(chat.id, true).then(async () => {
          await sagiri.sendText(chat.id, `Etto.. Hai minna~, Saya Sagiri. Untuk menampilkan menu ketik ${prefix}help`)
        })
	    }
	}*/
    })

    // ketika seseorang masuk/keluar dari group
    /*sagiri.onGlobalParicipantsChanged(async (event) => {
        const host = await sagiri.getHostNumber() + '@c.us'
        // kondisi ketika seseorang diinvite/join group lewat link
        if (event.action === 'add' && event.who !== host) {
            await sagiri.sendTextWithMentions(event.chat, `Etto.. Halo Welcome to the group @${event.who.replace('@c.us', '')} \n\nSemoga betah✨`)
        }
        // kondisi ketika seseorang dikick/keluar dari group
        if (event.action === 'remove' && event.who !== host) {
            await sagiri.sendTextWithMentions(event.chat, `Good bye @${event.who.replace('@c.us', '')}, :,(`)
        }
    })*/

    sagiri.onIncomingCall(async (callData) => {
        // ketika seseorang menelpon nomor bot akan mengirim pesan
        await sagiri.sendText(callData.peerJid, 'Ba-baka aku ga bisa mengangkat telpon.\nNelpon: Block\n\n-bot')
        .then(async () => {
            // bot akan memblock nomor itu
            await sagiri.contactBlock(callData.peerJid)
        })
    })

    // ketika seseorang mengirim pesan
    sagiri.onMessage(async (message) => {
        /*sagiri.getAllChats()
            .then((msg) => {
                if (msg >= 500) {
                    sagiri.deleteChat()
                }
            })*/
        HandleMsg(sagiri, message)    
    
    })
	
    // Message log for analytic
    sagiri.onAnyMessage((anal) => { 
        messageLog(anal.fromMe, anal.type)
    })
}

//create session
create(options(true, start))
    .then((sagiri) => start(sagiri))
    .catch((err) => new Error(err))
