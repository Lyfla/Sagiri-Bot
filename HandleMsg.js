require('dotenv').config()
const { decryptMedia } = require('@open-wa/wa-automate')

const moment = require('moment-timezone')
moment.tz.setDefault('Asia/Jakarta').locale('id')
const axios = require('axios')
const fetch = require('node-fetch')
const bent = require('bent')
const ffmpeg = require('fluent-ffmpeg')
const { Readable, Writable } = require('stream')

const appRoot = require('app-root-path')
const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const db_group = new FileSync(appRoot+'/lib/data/group.json')
const db = low(db_group)
db.defaults({ group: []}).write()

const { 
    removeBackgroundFromImageBase64
} = require('remove.bg')

const {
    exec
} = require('child_process')

const { 
    menuId, 
    cekResi, 
    urlShortener, 
    meme, 
    translate, 
    getLocationData,
    images,
    resep,
    rugapoi,
    rugaapi,
    cariKasar
} = require('./lib')

const { 
    msgFilter, 
    color, 
    processTime, 
    isUrl
} = require('./utils')

const { uploadImages } = require('./utils/fetcher')

const fs = require('fs-extra')
const { level } = require('chalk')
const textran = JSON.parse(fs.readFileSync('./lib/textran.json'))
const banned = JSON.parse(fs.readFileSync('./settings/banned.json'))
const simi = JSON.parse(fs.readFileSync('./settings/simi.json'))
const ngegas = JSON.parse(fs.readFileSync('./settings/ngegas.json'))
const setting = JSON.parse(fs.readFileSync('./settings/setting.json'))
//const muted = JSON.parse(fs.readFileSync('./settings/muted.json'))
const xp = JSON.parse(fs.readFileSync('./lib/xp.json'))
const errorurl2 = 'https://steamuserimages-a.akamaihd.net/ugc/954087817129084207/5B7E46EE484181A676C02DFCAD48ECB1C74BC423/?imw=512&&ima=fit&impolicy=Letterbox&imcolor=%23000000&letterbox=false'

/*const isMuted = (chatId) => {
    if(muted.includes(chatId)){
      return false
  }else{
      return true
      }
  }*/
  //Errror

let { 
    ownerNumber, 
    groupLimit, 
    memberLimit,
    prefix,
    restartState: isRestart,
} = setting

const {
    apiNoBg,
    apiSimi,
    vhtearkey // APIKEYNYA BELI DI api.vhtear.com
} = JSON.parse(fs.readFileSync('./settings/api.json'))

function formatin(duit){
    let	reverse = duit.toString().split('').reverse().join('');
    let ribuan = reverse.match(/\d{1,3}/g);
    ribuan = ribuan.join('.').split('').reverse().join('');
    return ribuan;
}

const inArray = (needle, haystack) => {
    let length = haystack.length;
    for(let i = 0; i < length; i++) {
        if(haystack[i].id == needle) return i;
    }
    return false;
}

if (typeof Array.prototype.splice === 'undefined') {
    Array.prototype.splice = function (index, howmany, elemes) {
        howmany = typeof howmany === 'undefined' || this.length;
        var elems = Array.prototype.slice.call(arguments, 2), newArr = this.slice(0, index), last = this.slice(index + howmany);
        newArr = newArr.concat.apply(newArr, elems);
        newArr = newArr.concat.apply(newArr, last);
        return newArr;
    }
}

module.exports = HandleMsg = async (sagiri, message) => {
    try {
        const { type, id, from, t, sender, isGroupMsg, chat, chatId, caption, isMedia, mimetype, quotedMsg, quotedMsgObj, mentionedJidList, author } = message
        let { body } = message
        var { name, formattedTitle } = chat
        let { pushname, verifiedName, formattedName } = sender
        pushname = pushname || verifiedName || formattedName // verifiedName is the name of someone who uses a business account
        const botNumber = await sagiri.getHostNumber() + '@c.us'
        const groupId = isGroupMsg ? chat.groupMetadata.id : ''
        const groupAdmins = isGroupMsg ? await sagiri.getGroupAdmins(groupId) : ''
        const isGroupAdmins = groupAdmins.includes(sender.id) || false
		const chats = (type === 'chat') ? body : (type === 'image' || type === 'video') ? caption : ''
		const pengirim = sender.id
        const isBotGroupAdmins = groupAdmins.includes(botNumber) || false

        // Bot Prefix
        body = (type === 'chat' && body.startsWith(prefix)) ? body : ((type === 'image' && caption || type === 'video' && caption) && caption.startsWith(prefix)) ? caption : ''
        const command = body.slice(1).trim().split(/ +/).shift().toLowerCase()
        const arg = body.trim().substring(body.indexOf(' ') + 1)
        const args = body.trim().split(/ +/).slice(1)
        const argz = body.trim().split(' ')
		const argx = chats.slice(0).trim().split(/ +/).shift().toLowerCase()
        const isCmd = body.startsWith(prefix)
        const uaOverride = process.env.UserAgent
        const url = args.length !== 0 ? args[0] : ''
        const isQuotedImage = quotedMsg && quotedMsg.type === 'image'
        const isQuotedVideo = quotedMsg && quotedMsg.type === 'video'
        const isQuotedAudio = quotedMsg && quotedMsg.type === 'audio'
		
		// [IDENTIFY]
		const isOwnerBot = ownerNumber.includes(pengirim)
        const isBanned = banned.includes(pengirim)
        const blockNumber = await sagiri.getBlockedIds()
		const isSimi = simi.includes(chatId)
		const isNgegas = ngegas.includes(chatId)
		const isKasar = await cariKasar(chats)

        // [BETA] Avoid Spam Message
        if (isCmd && msgFilter.isFiltered(from) && !isGroupMsg) { return console.log(color('[SPAM]', 'red'), color(moment(t * 1000).format('DD/MM/YY HH:mm:ss'), 'yellow'), color(`${command} [${args.length}]`), 'from', color(pushname)) }
        if (isCmd && msgFilter.isFiltered(from) && isGroupMsg) { return console.log(color('[SPAM]', 'red'), color(moment(t * 1000).format('DD/MM/YY HH:mm:ss'), 'yellow'), color(`${command} [${args.length}]`), 'from', color(pushname), 'in', color(name || formattedTitle)) }
        //if (isCmd && msgFilter.isFiltered(from)) return sagiri.reply(from, 'Spam!')
        //
        if(!isCmd && isKasar && isGroupMsg) { console.log(color('[BADW]', 'orange'), color(moment(t * 1000).format('DD/MM/YY HH:mm:ss'), 'yellow'), color(`${argx}`), 'from', color(pushname), 'in', color(name || formattedTitle)) }
        if (isCmd && !isGroupMsg) { console.log(color('[EXEC]'), color(moment(t * 1000).format('DD/MM/YY HH:mm:ss'), 'yellow'), color(`${command} [${args.length}]`), 'from', color(pushname)) }
        if (isCmd && isGroupMsg) { console.log(color('[EXEC]'), color(moment(t * 1000).format('DD/MM/YY HH:mm:ss'), 'yellow'), color(`${command} [${args.length}]`), 'from', color(pushname), 'in', color(name || formattedTitle)) }

        // [BETA] Avoid Spam Message
        //msgFilter.addFilter(from)

	// Filter Banned People
        if (isBanned) {
            return console.log(color('[BAN]', 'red'), color(moment(t * 1000).format('DD/MM/YY HH:mm:ss'), 'yellow'), color(`${command} [${args.length}]`), 'from', color(pushname))
        }
    
    //Mute Function
    /*if(body === '!mute' && isMuted(chatId) == true){
        if(isGroupMsg) {
            //if (!isAdmin) return sagiri.reply(from, 'Maaf, perintah ini hanya dapat dilakukan oleh admin Bot!', id)
            if(isMsgLimit(serial)){
                return
            }else{
                addMsgLimit(serial)
            }
            muted.push(chatId)
            fs.writeFileSync('./lib/muted.json', JSON.stringify(muted, null, 2))
            sagiri.reply(from, 'Bot telah di mute pada chat ini! !unmute untuk unmute!', id)
        }else{
            if(isMsgLimit(serial)){
                return
            }else{
                addMsgLimit(serial)
            }
            muted.push(chatId)
            fs.writeFileSync('./lib/muted.json', JSON.stringify(muted, null, 2))
            reply(from, 'Bot telah di mute pada chat ini! !unmute untuk unmute!', id)
        }
    }
    if(body === '!unmute' && isMuted(chatId) == false){
        if(isGroupMsg) {
            //if (!isAdmin) return sagiri.reply(from, 'Maaf, perintah ini hanya dapat dilakukan oleh admin Bot!', id)
            if(isMsgLimit(serial)){
                return
            }else{
                addMsgLimit(serial)
            }
            let index = muted.indexOf(chatId);
            muted.splice(index,1)
            fs.writeFileSync('./lib/muted.json', JSON.stringify(muted, null, 2))
            sagiri.reply(from, 'Bot telah di unmute!', id)         
        }else{
            if(isMsgLimit(serial)){
                return
            }else{
                addMsgLimit(serial)
            }
            let index = muted.indexOf(chatId);
            muted.splice(index,1)
            fs.writeFileSync('./lib/muted.json', JSON.stringify(muted, null, 2))
            sagiri.reply(from, 'Bot telah di unmute!', id)                   
        }
    }*/

    //XP Function
    function XpAdd (id) {
        //if (isAdmin) {return;}
        var found = false;
        Object.keys(xp).forEach((i) => {
            if(xp[i].id == id){
                found = i
            }
        })
        if (found !== false) {
            xp[found].xp += 1;
            fs.writeFileSync('./lib/xp.json',JSON.stringify(xp));
        }
    }
        

    //Filter Mute Chat
        //if (!isMuted(chatId)) return

    //Banned people
        if (isBanned) return

        //if (!isOwnerBot) return
        switch (command) {
        //XP
        /*case 'xp':
        var found = false
            const xpdat = JSON.parse(fs.readFileSync('./lib/xp.json'))
            for(let xpt of xpdat){
                if(xpt.id === serial){
                    let XpCounts = xpt.xp
                    if(XpCounts == 1000) return 
                    sagiri.reply(from, `Xp Anda:*${XpCounts}/999999\nLevel: Coming Soon*`, id)
                    found = true
                }
            }
            console.log(xp)
            console.log(xpdat)
            if (found === false){
                let obj = {id: `${serial}`, xp:1};
                limit.push(obj);
                fs.writeFileSync('./lib/xp.json',JSON.stringify(xp, 1));
                sagiri.reply(from, `Sisa limit request anda tersisa : *${limitCount}*\n\n_Note : Limit akan direset setiap jam 21:00!_`, id)
            }
            break*/
        // Menu and TnC
        case 'sagiri':
            const ngapain = Math.floor(Math.random() * 15)
            if(ngapain == 1) await sagiri.sendImage(from, './media/img/1.png')
            if(ngapain == 2) await sagiri.sendImage(from, './media/img/2.png')
            if(ngapain == 3) await sagiri.sendImage(from, './media/img/3.png')
            if(ngapain == 4) await sagiri.sendImage(from, './media/img/4.png')
            if(ngapain == 5) await sagiri.sendImage(from, './media/img/5.png')
            if(ngapain == 6) await sagiri.sendImage(from, './media/img/7.png')
            if(ngapain == 8) await sagiri.sendImage(from, './media/img/8.png')
            if(ngapain == 9) await sagiri.sendImage(from, './media/img/9.png')
            if(ngapain == 10) await sagiri.sendImage(from, './media/img/10.jpg')
            if(ngapain == 11) await sagiri.sendImage(from, './media/img/11.png')
            if(ngapain == 12) await sagiri.sendImage(from, './media/img/12.png')
            if(ngapain == 13) await sagiri.sendImage(from, './media/img/13.png')
            if(ngapain == 14) await sagiri.sendImage(from, './media/img/14.png')
            if(ngapain == 15) await sagiri.sendImage(from, './media/img/15.png')
            sagiri.sendPtt(from, './media/audio/sagiri.mp3')
            break
        case 'vn':
            const vnlole = ["./media/audio/vn/oni1.mp3", "./media/audio/vn/oni2.mp3", "./media/audio/vn/oni3.mp3", "./media/audio/vn/oni4.mp3", "./media/audio/vn/oni5.mp3", "./media/audio/vn/oni6.mp3", "./media/audio/vn/oni7.mp3", "./media/audio/vn/oni8.mp3", "./media/audio/vn/oni9.mp3", "./media/audio/vn/oni10.mp3", "./media/audio/vn/oni11.mp3", "./media/audio/vn/oni12.mp3", "./media/audio/vn/oni13.mp3", "./media/audio/vn/oni14.mp3", "./media/audio/vn/oni15.mp3", "./media/audio/vn/oni16.mp3", "./media/audio/vn/oni17.mp3", "./media/audio/vn/oni18.mp3", "./media/audio/vn/oni19.mp3", "./media/audio/vn/oni20.mp3", "./media/audio/vn/oni21.mp3", "./media/audio/vn/oni22.mp3", "./media/audio/vn/oni23.mp3", "./media/audio/vn/oni24.mp3", "./media/audio/vn/oni25.mp3", "./media/audio/vn/oni26.mp3", "./media/audio/vn/oni27.mp3"]
            let lolefbi = vnlole[Math.floor(Math.random() * vnlole.length)]
            sagiri.sendPtt(from, lolefbi)
            break
        case 'speed':
        case 'ping':
            await sagiri.sendText(from, `Pong!!!!\nSpeed: ${processTime(t, moment())} _Second_`)
            break
        case 'tnc':
            await sagiri.sendText(from, menuId.textTnC())
            break
        case 'rules':
            await sagiri.sendText(from, menuId.textRules())
            break
        case 'credit':
        case 'credits':
            await sagiri.sendText(from, menuId.textCredit())
            break
        //case 'menu':
        case 'help':
            await sagiri.sendText(from, menuId.textMenu(pushname))
            .then(() => ((isGroupMsg) && (isGroupAdmins)) ? sagiri.sendText(from, `Menu Admin Grup: *${prefix}menuadmin*`) : null)
            break
        case 'menuadmin':
            if (!isGroupMsg) return sagiri.reply(from, 'Maaf, perintah ini hanya dapat dipakai didalam grup!', id)
            if (!isGroupAdmins) return sagiri.reply(from, 'Gagal, perintah ini hanya dapat digunakan oleh admin grup!', id)
            await sagiri.sendText(from, menuId.textAdmin())
            break
        case 'donate':
        case 'donasi':
            await sagiri.sendText(from, menuId.textDonasi())
                sagiri.sendImage(from, './media/donate.png')
            break
        case 'onichan':
        case 'oniichan':
        case 'owner':
            await sagiri.sendImage(from, './owner/info/owner.jpg', 'owner.jpg', '《📍》 *Nama:* Dwi Rizqi\n《⌛》 *Umur:* 13\n《📆》 *Ulang Tahun:* Mei 07\n《❤》 *Status*: JOMBLO :v')
            sagiri.sendContact(from, '6281358181668@c.us')
            //sagiri.reply(from, 'Onichan gak bisa di contact dulu, lagi Sibuk/PAS\nUntuk melaporkan bug pakai !report bug [teks]')
            //sagiri.reply(from, 'Jika menemukan bug/error tolong laporkan ke onichan')
            break
        case 'join':
            if (!isOwnerBot) return sagiri.reply(from, `Hanya untuk oniichan`)
            if (args.length == 0) return sagiri.reply(from, `Jika kalian ingin mengundang bot kegroup silahkan invite atau dengan\nketik ${prefix}join [link group]`, id)
            let linkgrup = body.slice(6)
            let islink = linkgrup.match(/(https:\/\/chat.whatsapp.com)/gi)
            let chekgrup = await sagiri.inviteInfo(linkgrup)
            if (!islink) return sagiri.reply(from, 'Maaf link group-nya salah! silahkan kirim link yang benar', id)
            if (isOwnerBot) {
                await sagiri.joinGroupViaLink(linkgrup)
                      .then(async () => {
                          await sagiri.sendText(from, 'Berhasil join grup via link!')
                          await sagiri.sendText(chekgrup.id, `Etto.. Hai minna~, Saya Sagiri. Untuk menampilkan menu ketik ${prefix}help`)
                      })
            } else {
                let cgrup = await sagiri.getAllGroups()
                if (cgrup.length > groupLimit) return sagiri.reply(from, `Gomenasai, Aku kebanyakan Group\nBatas Group: ${groupLimit}`, id)
                if (cgrup.size < memberLimit) return sagiri.reply(from, `Gomenasai, Member di group ini tidak mencukupi, Minimal: ${memberLimit} Member`, id)
                await sagiri.joinGroupViaLink(linkgrup)
                      .then(async () =>{
                          await sagiri.reply(from, 'Berhasil join grup via link!', id)
                      })
                      .catch(() => {
                          sagiri.reply(from, 'Gagal!', id)
                      })
            }
            break
        case 'getses':
            case 'getses':
            const sesPic = await sagiri.getSnapshot()
            sagiri.sendFile(from, sesPic, 'session.png', 'Nih boss', id)
            break
        
        // Sticker Creator
        case 'sticker':
        case 'stiker':
            if ((isMedia || isQuotedImage) && args.length === 0) {
                const encryptMedia = isQuotedImage ? quotedMsg : message
                const _mimetype = isQuotedImage ? quotedMsg.mimetype : mimetype
                const mediaData = await decryptMedia(encryptMedia, uaOverride)
                const imageBase64 = `data:${_mimetype};base64,${mediaData.toString('base64')}`
                sagiri.sendImageAsSticker(from, imageBase64)
                .then(() => {
                    //sagiri.reply(from, 'Here\'s your sticker')
                    console.log(`Sticker Processed for ${processTime(t, moment())} Second`)
                })
            } else if (args[0] === 'nobg') {
                if (isMedia || isQuotedImage) {
                    try {
                    var mediaData = await decryptMedia(message, uaOverride)
                    var imageBase64 = `data:${mimetype};base64,${mediaData.toString('base64')}`
                    var base64img = imageBase64
                    var outFile = './media/noBg.png'
		            // kamu dapat mengambil api key dari website remove.bg dan ubahnya difolder settings/api.json
                    var result = await removeBackgroundFromImageBase64({ base64img, apiKey: apiNoBg, size: 'auto', type: 'auto', outFile })
                    await fs.writeFile(outFile, result.base64img)
                    await sagiri.sendImageAsSticker(from, `data:${mimetype};base64,${result.base64img}`)
                    } catch(err) {
                    console.log(err)
	   	            await sagiri.reply(from, 'Maaf batas penggunaan hari ini sudah mencapai maksimal', id)
                    }
                }
            } else if (args[0] === 'img') {
                if (quotedMsg && quotedMsg.type == 'sticker') {
                    const mediaData = await decryptMedia(quotedMsg)
                    sagiri.reply(from, '[WAIT] Sedang di proses⏳ silahkan tunggu!', id)
                    const imageBase64 = `data:${quotedMsg.mimetype};base64,${mediaData.toString('base64')}`
                    await sagiri.sendFile(from, imageBase64, 'imagesticker.jpg', 'Success Convert Sticker to Image!', id)
                } else if (!quotedMsg) return sagiri.reply(from, 'Mohon tag sticker yang ingin dijadikan gambar!', id)
            } else if (args.length === 1) {
                if (!isUrl(url)) { await sagiri.reply(from, 'Maaf, link yang kamu kirim tidak valid.', id) }
                sagiri.sendStickerfromUrl(from, url).then((r) => (!r && r !== undefined)
                    ? sagiri.sendText(from, 'Maaf, link yang kamu kirim tidak memuat gambar.')
                    : sagiri.reply(from, 'Here\'s your sticker')).then(() => console.log(`Sticker Processed for ${processTime(t, moment())} Second`))
            } else {
                await sagiri.reply(from, `KOre nani? Untuk menggunakan ${prefix}sticker\n\n\nKirim gambar dengan caption\n${prefix}sticker <biasa>\n${prefix}sticker nobg <tanpa background>\n${prefix}sticker img <mengubah stiker menjadi gambar>\n\natau Kirim pesan dengan\n${prefix}sticker <link_gambar>`, id)
            }
            break
        case 'stickergif':
        case 'stikergif':
            if (isMedia || isQuotedVideo) {
                if (mimetype === 'video/mp4' && message.duration < 10 || mimetype === 'image/gif' && message.duration < 10) {
                    var mediaData = await decryptMedia(message, uaOverride)
                    sagiri.reply(from, '[WAIT] Sedang di proses⏳ silahkan tunggu ± 1 min!', id)
                    var filename = `./media/stickergif.${mimetype.split('/')[1]}`
                    await fs.writeFileSync(filename, mediaData)
                    await exec(`gify ${filename} ./media/stickergf.gif --fps=30 --scale=240:240`, async function (error, stdout, stderr) {
                        var gif = await fs.readFileSync('./media/stickergf.gif', { encoding: "base64" })
                        await sagiri.sendImageAsSticker(from, `data:image/gif;base64,${gif.toString('base64')}`)
                        .catch(() => {
                            sagiri.reply(from, 'Maaf filenya terlalu besar!', id)
                        })
                    })
                  } else {
                    sagiri.reply(from, `[❗] Kirim gif dengan caption *${prefix}stickergif* max 10 sec!`, id)
                   }
                } else {
		    sagiri.reply(from, `[❗] Kirim gif dengan caption *${prefix}stickergif*`, id)
	        }
            break
        case 'stikergiphy':
        case 'stickergiphy':
            if (args.length !== 1) return sagiri.reply(from, `Maaf, format pesan salah.\nKetik pesan dengan ${prefix}stickergiphy <link_giphy>`, id)
            const isGiphy = url.match(new RegExp(/https?:\/\/(www\.)?giphy.com/, 'gi'))
            const isMediaGiphy = url.match(new RegExp(/https?:\/\/media.giphy.com\/media/, 'gi'))
            if (isGiphy) {
                const getGiphyCode = url.match(new RegExp(/(\/|\-)(?:.(?!(\/|\-)))+$/, 'gi'))
                if (!getGiphyCode) { return sagiri.reply(from, 'Gagal mengambil kode giphy', id) }
                const giphyCode = getGiphyCode[0].replace(/[-\/]/gi, '')
                const smallGifUrl = 'https://media.giphy.com/media/' + giphyCode + '/giphy-downsized.gif'
                sagiri.sendGiphyAsSticker(from, smallGifUrl).then(() => {
                    sagiri.reply(from, 'Here\'s your sticker')
                    console.log(`Sticker Processed for ${processTime(t, moment())} Second`)
                }).catch((err) => console.log(err))
            } else if (isMediaGiphy) {
                const gifUrl = url.match(new RegExp(/(giphy|source).(gif|mp4)/, 'gi'))
                if (!gifUrl) { return sagiri.reply(from, 'Gagal mengambil kode giphy', id) }
                const smallGifUrl = url.replace(gifUrl[0], 'giphy-downsized.gif')
                sagiri.sendGiphyAsSticker(from, smallGifUrl)
                .then(() => {
                    sagiri.reply(from, 'Here\'s your sticker')
                    console.log(`Sticker Processed for ${processTime(t, moment())} Second`)
                })
                .catch(() => {
                    sagiri.reply(from, `Ada yang error!`, id)
                })
            } else {
                await sagiri.reply(from, 'Maaf, command sticker giphy hanya bisa menggunakan link dari giphy.  [Giphy Only]', id)
            }
            break
        case 'sand':
            if (args.length === 0)  return sagiri.reply(from, 'Kirim perintah *!sandwriting [ Teks ]*\nContoh *!sandwriting Owner Jomblo*', id)
            sagiri.reply(from, 'Fitur ini sedang di perbaiki')
            /*const swrt = body.slice(6)
            try {
            const swrt2 = await axios.get('https://api.vhtear.com/sand_writing?text1=' + swrt + '&apikey=' + vhtearkey)
            const { imgUrl } = swrt2.data.result
            const swrt3 = `*「 SAND WRITING 」*

*Text : ${swrt}*`
            const pictk = await bent("buffer")(imgUrl)
            const base64 = `data:image/jpg;base64,${pictk.toString("base64")}`
            sagiri.sendImage(from, base64, swrt3)
            } catch (err) {
             console.error(err.message)
             await sagiri.sendFileFromUrl(from, errorurl2, 'error.png', '💔️ Maaf, User tidak ditemukan')
             sagiri.sendText(ownerNumber, 'Sand Writing Error : ' + err)
           }*/
          break
        case 'meme':
            if ((isMedia || isQuotedImage) && args.length >= 2) {
                const top = arg.split('|')[0]
                const bottom = arg.split('|')[1]
                const encryptMedia = isQuotedImage ? quotedMsg : message
                const mediaData = await decryptMedia(encryptMedia, uaOverride)
                const getUrl = await uploadImages(mediaData, false)
                const ImageBase64 = await meme.custom(getUrl, top, bottom)
                sagiri.sendFile(from, ImageBase64, 'image.png', '', null, true)
                    .then(() => {
                        sagiri.reply(from, 'Kore, Matte gomennasai...',id)
                    })
                    .catch(() => {
                        sagiri.reply(from, 'Ada yang error!')
                    })
            } else {
                await sagiri.reply(from, `Tidak ada gambar! Silahkan kirim gambar dengan caption ${prefix}meme <teks_atas> | <teks_bawah>\ncontoh: ${prefix}meme teks atas | teks bawah`, id)
            }
            break
        case 'ttp':
            const { getStickerMaker } = require('./lib/ttp')
            if (!isGroupMsg) return sagiri.reply(from, 'Perintah ini hanya bisa di gunakan dalam group!', message.id)
                try
                {
                    const string = body.toLowerCase().includes('!ttp') ? body.slice(5) : body.slice(5)
                    if(args)
                    {
                        if(quotedMsgObj == null)
                        {
                            const apaan = await getStickerMaker(string)
                            if(apaan.status == true)
                            {
                                try{
                                    await sagiri.sendImageAsSticker(from, apaan.base64)
                                }catch(err) {
                                    await sagiri.reply(from, 'Gagal membuat.', id)
                                } 
                            }else{
                                await sagiri.reply(from, apaan.reason, id)
                            }
                        }else if(quotedMsgObj != null){
                            const Apaan = await getStickerMaker(quotedMsgObj.body)
                            if(Apaan.status == true)
                            {
                                try{
                                    await sagiri.sendImageAsSticker(from, Apaan.base64)
                                }catch(err) {
                                    await sagiri.reply(from, 'Gagal membuat.', id)
                                } 
                            }else{
                                await sagiri.reply(from, Apaan.reason, id)
                            }
                        }
                       
                    }else{
                        await sagiri.reply(from, 'Tidak boleh kosong.', id)
                    }
                }catch(error)
                {
                    console.log(error)
                }
            break;
        case 'tahta':
            const jreng = body.slice(7)
            if (!jreng) return sagiri.reply(from, 'Kirim perintah *!tahta [teks]*\n\nContoh *!tahta Ica\n\nYang namanya *Icha* jangan Ge Er', id)
            if (jreng.length > 7) return sagiri.reply(from, 'Maksimal 7 Huruf!', id)
            sagiri.sendText(from, '_Sedang diproses, mohon tunggu sebentar!..._', id)
            await sagiri.sendFileFromUrl(from, `https://api.vhtear.com/hartatahta?text=${jreng}&apikey=${vhtearkey}`,`${jreng}.jpg`,`Harta Tahta ${jreng}`, id)        
            break
        case 'ttg':
            if (!isGroupMsg) return sagiri.reply(from, `Perintah ini hanya bisa di gunakan dalam group!`, id)
            sagiri.reply(from, 'Fitur ini dalam perbaikan')
            /*try {
                if (quotedMsgObj == null) {
                    if (args.length === 0) return sagiri.reply(from, `Kirim perintah *!ttg [ Teks ]*, contoh *!ttg Oniichan daisuki*`, id)
                        await sagiri.sendStickerfromUrl(from, `https://api.vhtear.com/textxgif?text=${body.slice(5)}&apikey=${vhtearkey}`)
                } else {
                    await sagiri.sendStickerfromUrl(from, `https://api.vhtear.com/textxgif?text=${quotedMsgObj}&apikey=${vhtearkey}`)
                }
            } catch(e) {
                console.log(e)
                sagiri.reply(from, 'Ada yang error!')
            }*/
            break
        case 'quotemaker':
            const qmaker = body.trim().split('|')
            if (qmaker.length >= 3) {
                const quotes = qmaker[1]
                const author = qmaker[2]
                const theme = qmaker[3]
                sagiri.reply(from, 'Chottomatte..', id)
                try {
                    const hasilqmaker = await images.quote(quotes, author, theme)
                    sagiri.sendFileFromUrl(from, `${hasilqmaker}`, '', 'Kore, matte gomennasai..', id)
                } catch {
                    sagiri.reply('proses gagal, isinya udah benar belum?', id)
                }
            } else {
                sagiri.reply(from, `Pemakaian ${prefix}quotemaker |isi quote|author|theme\n\ncontoh: ${prefix}quotemaker |daisuki|-lyfla|random\n\nuntuk theme nya pakai yang random`)
            }
            break
        case 'nulis':
            if (args.length == 0) return sagiri.reply(from, `Membuat bot menulis teks yang dikirim menjadi gambar\nPemakaian: ${prefix}nulis [teks]\n\ncontoh: ${prefix}nulis daisuki`, id)
            const nulisq = body.slice(7)
            const nulisp = await rugaapi.tulis(nulisq)
            await sagiri.sendImage(from, `${nulisp}`, '', 'Kore, matte gomennasai...', id)
            .catch(() => {
                sagiri.reply(from, 'Ada yang Error!', id)
            })
            break
        /*case 'bass':
            if (isQuotedAudio) {
                let dB = 20
                let freq = 60
                if (this.args[0]) dB = clamp(parseInt(this.args[0]) || 20, 0, 50)
                if (this.args[1]) freq = clamp(parseInt(this.args[1]) || 20, 20, 500)
                console.log(color('[WAPI]', 'green'), 'Downloading and decrypt media...')
                const mediaData = await decryptMedia(quotedMsg)
                const bass = await stream2Buffer(write => {
                    ffmpeg(buffer2Stream(mediaData))
                        .audioFilter('equalizer=f=' + freq + ':width_type=o:width=2:g=' + dB)
                        .format('mp3')
                        .on('start', commandLine => console.log(color('[FFmpeg]'), commandLine))
                        .on('progress', progress => console.log(color('[FFmpeg]'), progress))
                        .on('end', () => console.log(color('[FFmpeg]'), 'Processing finished!'))
                        .stream(write)
                })
                sagiri.sendFile(from, baseURI(bass, 'audio/mp3'), 'bass_boosted.mp3', '', id)
            }
            break
        case 'earape':
            if (isQuotedAudio || isQuotedVideo) {
                const encryptMedia = isQuotedAudio || isQuotedVideo ? quotedMsg : message
                const _mimetype = encryptMedia.mimetype
                sagiri.reply(from, '[WAIT] Sedang di proses⏳ silahkan tunggu ± 1 min!'(_mimetype.replace(/.+\//, ''), 'mp3', '⚠ WARNING ⚠\n🔇 Jangan pake headset :v'), id)
                console.log(color('[WAPI]', 'green'), 'Downloading and decrypt media...')
                const mediaData = await decryptMedia(encryptMedia)
                const distord = await stream2Buffer(write => {
                    ffmpeg(buffer2Stream(mediaData))
                        .audioFilter('aeval=sgn(val(ch))')
                        .format('mp3')
                        .on('start', commandLine => console.log(color('[FFmpeg]'), commandLine))
                        .on('progress', progress => console.log(color('[FFmpeg]'), progress))
                        .on('end', () => console.log(color('[FFmpeg]'), 'Processing finished!'))
                        .stream(write)
                })
                sagiri.sendFile(from, baseURI(distord, 'audio/mp3'), 'earapeboy.mp3', '', id)
            } else if (isQuotedVideo) {
                // // Bantuin ffmpeg nya :')
                // // biar bisa video filter sama audio filter
                sagiri.reply(from, '[WAIT] Sedang di proses⏳ silahkan tunggu ± 1 min!'('mp4', 'mp4', '⚠ WARNING ⚠\n🔇 Jangan pake headset :v'), id)
                const encryptMedia = isQuotedVideo ? quotedMsg : message
                console.log(color('[WAPI]', 'green'), 'Downloading and decrypt media...')
                const mediaData = await decryptMedia(encryptMedia)
                const distord = await stream2Buffer(write => {
                    ffmpeg(buffer2Stream(mediaData))
                        .complexFilter('scale=iw/2:ih/2,eq=saturation=100:contrast=10:brightness=0.3:gamma=10,noise=alls=100:allf=t,unsharp=5:5:1.25:5:5:1,eq=gamma_r=100:gamma=50,scale=iw/5:ih/5,scale=iw*4:ih*4,eq=brightness=-.1,unsharp=5:5:1.25:5:5:1')
                        .audioFilter('aeval=sgn(val(ch))')
                        .outputOptions(
                            '-codec:v', 'libx264',
                            '-crf', '32',
                            '-preset', 'veryfast'
                        )
                        .format('mp4')
                        .on('start', commandLine => console.log(color('[FFmpeg]'), commandLine))
                        .on('progress', progress => console.log(color('[FFmpeg]'), progress))
                        .on('end', () => console.log(color('[FFmpeg]'), 'Processing finished!'))
                        .stream(write)
                })
                sagiri.sendFile(from, baseURI(distord, 'video/mp4'), 'earapeboy.mp4', '', id)
            }

function clamp(value, min, max) {
    return Math.min(Math.max(min, value), max)
}

function stream2Buffer(cb = noop) {
    return new Promise(resolve => {
        let write = new Writable()
        write.data = []
        write.write = function (chunk) {
            this.data.push(chunk)
        }
        write.on('finish', function () {
            resolve(Buffer.concat(this.data))
        })

        cb(write)
    })
}

function buffer2Stream(buffer) {
    return new Readable({
        read() {
            this.push(buffer)
            this.push(null)
        }
    })
}

function baseURI(buffer = Buffer.from([]), metatype = 'text/plain') {
    return `data:${metatype};base64,${buffer.toString('base64')}`
}*/

        //Islam Command
        case 'listsurah':
            try {
                axios.get('https://raw.githubusercontent.com/ArugaZ/grabbed-results/main/islam/surah.json')
                .then((response) => {
                    let hehex = '╔══✪〘 List Surah 〙✪══\n'
                    for (let i = 0; i < response.data.data.length; i++) {
                        hehex += '╠➥ '
                        hehex += response.data.data[i].name.transliteration.id.toLowerCase() + '\n'
                            }
                        hehex += '╚═〘 *Sagiri* 〙'
                    sagiri.reply(from, hehex, id)
                })
            } catch(err) {
                sagiri.reply(from, err, id)
            }
            break
        case 'infosurah':
            if (args.length == 0) return sagiri.reply(from, `*_${prefix}infosurah <nama surah>_*\nMenampilkan informasi lengkap mengenai surah tertentu. Contoh penggunan: ${prefix}infosurah al-baqarah`, message.id)
                var responseh = await axios.get('https://raw.githubusercontent.com/ArugaZ/grabbed-results/main/islam/surah.json')
                var { data } = responseh.data
                var idx = data.findIndex(function(post, index) {
                  if((post.name.transliteration.id.toLowerCase() == args[0].toLowerCase())||(post.name.transliteration.en.toLowerCase() == args[0].toLowerCase()))
                    return true;
                });
                var pesan = ""
                pesan = pesan + "Nama : "+ data[idx].name.transliteration.id + "\n" + "Asma : " +data[idx].name.short+"\n"+"Arti : "+data[idx].name.translation.id+"\n"+"Jumlah ayat : "+data[idx].numberOfVerses+"\n"+"Nomor surah : "+data[idx].number+"\n"+"Jenis : "+data[idx].revelation.id+"\n"+"Keterangan : "+data[idx].tafsir.id
                sagiri.reply(from, pesan, message.id)
              break
        case 'surah':
            if (args.length == 0) return sagiri.reply(from, `*_${prefix}surah <nama surah> <ayat>_*\nMenampilkan ayat Al-Quran tertentu beserta terjemahannya dalam bahasa Indonesia. Contoh penggunaan : ${prefix}surah al-baqarah 1\n\n*_${prefix}surah <nama surah> <ayat> en/id_*\nMenampilkan ayat Al-Quran tertentu beserta terjemahannya dalam bahasa Inggris / Indonesia. Contoh penggunaan : ${prefix}surah al-baqarah 1 id`, message.id)
                var responseh = await axios.get('https://raw.githubusercontent.com/ArugaZ/grabbed-results/main/islam/surah.json')
                var { data } = responseh.data
                var idx = data.findIndex(function(post, index) {
                  if((post.name.transliteration.id.toLowerCase() == args[0].toLowerCase())||(post.name.transliteration.en.toLowerCase() == args[0].toLowerCase()))
                    return true;
                });
                nmr = data[idx].number
                if(!isNaN(nmr)) {
                  var responseh2 = await axios.get('https://api.quran.sutanlab.id/surah/'+nmr+"/"+args[1])
                  var {data} = responseh2.data
                  var last = function last(array, n) {
                    if (array == null) return void 0;
                    if (n == null) return array[array.length - 1];
                    return array.slice(Math.max(array.length - n, 0));
                  };
                  bhs = last(args)
                  pesan = ""
                  pesan = pesan + data.text.arab + "\n\n"
                  if(bhs == "en") {
                    pesan = pesan + data.translation.en
                  } else {
                    pesan = pesan + data.translation.id
                  }
                  pesan = pesan + "\n\n(Q.S. "+data.surah.name.transliteration.id+":"+args[1]+")"
                  sagiri.reply(from, pesan, message.id)
                }
              break
        case 'tafsir':
            if (args.length == 0) return sagiri.reply(from, `*_${prefix}tafsir <nama surah> <ayat>_*\nMenampilkan ayat Al-Quran tertentu beserta terjemahan dan tafsirnya dalam bahasa Indonesia. Contoh penggunaan : ${prefix}tafsir al-baqarah 1`, message.id)
                var responsh = await axios.get('https://raw.githubusercontent.com/ArugaZ/grabbed-results/main/islam/surah.json')
                var {data} = responsh.data
                var idx = data.findIndex(function(post, index) {
                  if((post.name.transliteration.id.toLowerCase() == args[0].toLowerCase())||(post.name.transliteration.en.toLowerCase() == args[0].toLowerCase()))
                    return true;
                });
                nmr = data[idx].number
                if(!isNaN(nmr)) {
                  var responsih = await axios.get('https://api.quran.sutanlab.id/surah/'+nmr+"/"+args[1])
                  var {data} = responsih.data
                  pesan = ""
                  pesan = pesan + "Tafsir Q.S. "+data.surah.name.transliteration.id+":"+args[1]+"\n\n"
                  pesan = pesan + data.text.arab + "\n\n"
                  pesan = pesan + "_" + data.translation.id + "_" + "\n\n" +data.tafsir.id.long
                  sagiri.reply(from, pesan, message.id)
              }
              break
        case 'alaudio':
            if (args.length == 0) return sagiri.reply(from, `*_${prefix}ALaudio <nama surah>_*\nMenampilkan tautan dari audio surah tertentu. Contoh penggunaan : ${prefix}ALaudio al-fatihah\n\n*_${prefix}ALaudio <nama surah> <ayat>_*\nMengirim audio surah dan ayat tertentu beserta terjemahannya dalam bahasa Indonesia. Contoh penggunaan : ${prefix}ALaudio al-fatihah 1\n\n*_${prefix}ALaudio <nama surah> <ayat> en_*\nMengirim audio surah dan ayat tertentu beserta terjemahannya dalam bahasa Inggris. Contoh penggunaan : ${prefix}ALaudio al-fatihah 1 en`, message.id)
              ayat = "ayat"
              bhs = ""
                var responseh = await axios.get('https://raw.githubusercontent.com/ArugaZ/grabbed-results/main/islam/surah.json')
                var surah = responseh.data
                var idx = surah.data.findIndex(function(post, index) {
                  if((post.name.transliteration.id.toLowerCase() == args[0].toLowerCase())||(post.name.transliteration.en.toLowerCase() == args[0].toLowerCase()))
                    return true;
                });
                nmr = surah.data[idx].number
                if(!isNaN(nmr)) {
                  if(args.length > 2) {
                    ayat = args[1]
                  }
                  if (args.length == 2) {
                    var last = function last(array, n) {
                      if (array == null) return void 0;
                      if (n == null) return array[array.length - 1];
                      return array.slice(Math.max(array.length - n, 0));
                    };
                    ayat = last(args)
                  } 
                  pesan = ""
                  if(isNaN(ayat)) {
                    var responsih2 = await axios.get('https://raw.githubusercontent.com/ArugaZ/grabbed-results/main/islam/surah/'+nmr+'.json')
                    var {name, name_translations, number_of_ayah, number_of_surah,  recitations} = responsih2.data
                    pesan = pesan + "Audio Quran Surah ke-"+number_of_surah+" "+name+" ("+name_translations.ar+") "+ "dengan jumlah "+ number_of_ayah+" ayat\n"
                    pesan = pesan + "Dilantunkan oleh "+recitations[0].name+" : "+recitations[0].audio_url+"\n"
                    pesan = pesan + "Dilantunkan oleh "+recitations[1].name+" : "+recitations[1].audio_url+"\n"
                    pesan = pesan + "Dilantunkan oleh "+recitations[2].name+" : "+recitations[2].audio_url+"\n"
                    sagiri.reply(from, pesan, message.id)
                  } else {
                    var responsih2 = await axios.get('https://api.quran.sutanlab.id/surah/'+nmr+"/"+ayat)
                    var {data} = responsih2.data
                    var last = function last(array, n) {
                      if (array == null) return void 0;
                      if (n == null) return array[array.length - 1];
                      return array.slice(Math.max(array.length - n, 0));
                    };
                    bhs = last(args)
                    pesan = ""
                    pesan = pesan + data.text.arab + "\n\n"
                    if(bhs == "en") {
                      pesan = pesan + data.translation.en
                    } else {
                      pesan = pesan + data.translation.id
                    }
                    pesan = pesan + "\n\n(Q.S. "+data.surah.name.transliteration.id+":"+args[1]+")"
                    await sagiri.sendFileFromUrl(from, data.audio.secondary[0])
                    await sagiri.reply(from, pesan, message.id)
                  }
              }
              break
        case 'jsolat':
            if (args.length == 0) return sagiri.reply(from, `Untuk melihat jadwal solat dari setiap daerah yang ada\nketik: ${prefix}jsolat [daerah]\n\nuntuk list daerah yang ada\nketik: ${prefix}daerah`, id)
            const solatx = body.slice(8)
            const solatj = await rugaapi.jadwaldaerah(solatx)
            await sagiri.reply(from, solatj, id)
            .catch(() => {
                sagiri.reply(from, 'Sudah input daerah yang ada dilist?', id)
            })
            break
        case 'daerah':
            const daerahq = await rugaapi.daerah()
            await sagiri.reply(from, daerahq, id)
            .catch(() => {
                sagiri.reply(from, 'Ada yang Error!', id)
            })
            break
        //Media
        case 'pinterest':
            sagiri.reply(from, 'Sedang dalam perbaikan')
            /*if (!isGroupMsg) return sagiri.reply(from, 'Perintah ini hanya bisa di gunakan dalam group!', id)
            if (args.length === 0) return sagiri.reply(from, 'Kirim perintah *!pinterest [query]*\nContoh : *!pinterest Sagiri*', id)
            const ptrsq = body.slice(11)
            const ptrs = await axios.get('https://api.fdci.se/rep.php?gambar='+ptrsq)
            const b = JSON.parse(JSON.stringify(ptrs.data))
            const ptrs2 =  b[Math.floor(Math.random() * b.length)]
            const image = await bent("buffer")(ptrs2)
            const base64 = `data:image/jpg;base64,${image.toString("base64")}`
            sagiri.sendImage(from, base64, 'ptrs.jpg', `*Pinterest*\n\n*Hasil Pencarian : ${ptrsq}*`)*/
            break
        case 'ytmp3':
            if (args.length === 0) return sagiri.reply(from, `Untuk mendownload lagu dari youtube\nketik: ${prefix}ytmp3 [link_yt]`, id)
            let isLinks = args[0].match(/(?:https?:\/{2})?(?:w{3}\.)?youtu(?:be)?\.(?:com|be)(?:\/watch\?v=|\/)([^\s&]+)/)
            if (!isLinks) return sagiri.reply(from, '[❗] Link yang anda kirim tidak valid!', id)
            try {
                sagiri.reply(from, '[ WAIT ] Sedang di proses⏳ silahkan tunggu sebentar', id)
                const vhtearyt3 = await fetch(`https://api.vhtear.com/ytdl?link=${args[0]}&apikey=${vhtearkey}`)
                if (!vhtearyt3.ok) throw new Error(`Error ytmp3 3 : ${vhtearyt3.statusText}`)
                const vhtearyt33 = await vhtearyt3.json()
                 if (vhtearyt33.status == false) {
                    sagiri.reply(from, `*Maaf Terdapat kesalahan saat mengambil data, mohon pilih media lain...*`, id)
                } else {
                    const { title, ext, size, UrlMp3, status, imgUrl } = await vhtearyt33.result
                    console.log(`Hmm apaan ya ${ext}\n${size}\n${status}`)
                    //if(Number(vhtearyt33.result.size.split(' MB')[0]) >= 10.00) return sagiri.sendFileFromUrl(from, imgUrl, `thumb.jpg`, `*「 YOUTUBE MP3 」*\n\n• *Judul* : ${title}\n• *Filesize* : ${size}\n\n_Maaf, Durasi audio melebihi 10 MB. Silahkan download audio melalui link dibawah_.\n${UrlMp3}`, id)
                    const captions = `*「 YOUTUBE MP3 」*\n\n• *Judul* : ${title}\n• *Filesize* : ${size}\n\n_Silahkan tunggu file lagu sedang dikirim mungkin butuh beberapa menit_`
                    sagiri.sendFileFromUrl(from, imgUrl, `thumb.jpg`, captions, id)
                    //await sagiri.sendFile(from, UrlMp3, `${title}.mp3`, '', id)
                    await sagiri.sendFileFromUrl(from, UrlMp3, `${title}.mp3`, '', id).catch(() => sagiri.reply(from, '[❗] Terjadi kesalahan, mungkin error di sebabkan oleh sistem', id))
                }
            } catch (err) {
                sagiri.sendText(ownerNumber, 'Error ytmp3 : '+ err)
                sagiri.reply(from, '[❗] Terjadi kesalahan, tidak dapat meng konversi ke mp3!', id)
            }
            break   
        case 'ytmp4':
            if (args.length === 0) return sagiri.reply(from, `Untuk mendownload video dari youtube\nketik: ${prefix}ytmp4 [link_yt]`)
            let isLin = args[0].match(/(?:https?:\/{2})?(?:w{3}\.)?youtu(?:be)?\.(?:com|be)(?:\/watch\?v=|\/)([^\s&]+)/)
            if (!isLin) return sagiri.reply(from, '[❗] Link yang anda kirim tidak valid!', id)
            try {
                sagiri.reply(from, '[ WAIT ] Sedang di proses⏳ silahkan tunggu sebentar', id)
                const ytvh = await fetch(`http://api.vhtear.com/ytdl?link=${args[0]}&apikey=${vhtearkey}`)
                if (!ytvh.ok) throw new Error(`Error Get Video : ${ytvh.statusText}`)
                const ytvh2 = await ytvh.json()
                 if (ytvh2.status == false) {
                    sagiri.reply(from, `*Maaf Terdapat kesalahan saat mengambil data, mohon pilih media lain...*`, id)
                } else {
                    const { title, UrlVideo, imgUrl, size } = await ytvh2.result
                    //if (Number(ytvh2.result.size.split(' MB')[0]) > 30.00) return sagiri.sendFileFromUrl(from, UrlVideo, `${title}.mp4`, `*YOUTUBE MP4*\n\n• *Judul* : ${title}\n• *Filesize* : ${size}\n\n__Maaf, Ukuran video melebihi 30 MB. Silahkan download video melalui link dibawah_.\n${UrlVideo}`, id)
                    sagiri.sendFileFromUrl(from, imgUrl, 'thumb.jpg', `*「 YOUTUBE MP4 」*\n\n• *Judul* : ${title}\n• *Filesize* : ${size}\n\n_Silahkan tunggu, video sedang dikirim mungkin butuh beberapa menit_`, id)
                    await sagiri.sendFileFromUrl(from, UrlVideo, `${title}.mp4`, '', id).catch(() => sagiri.reply(from, '[❗] Terjadi kesalahan, mungkin error di sebabkan oleh sistem.', id))
                }
            } catch (err) {
                sagiri.sendText(ownerNumber, 'Error ytmp4 : '+ err)
                sagiri.reply(from, '[❗] Terjadi kesalahan, mungkin error di sebabkan oleh sistem.', id)
                console.log(err)
            }
            break
        case 'fb':
            if (args.length === 0) return sagiri.reply(from, `Kirim perintah *!fb [ Link Fb ]*\nContoh : *!fb https://www.facebook.com/24609282673/posts/10158628585367674/*`, id)
            try {
            sagiri.reply(from, '[ WAIT ] Sedang di proses⏳ silahkan tunggu sebentar', id)
            const resp = await axios.get('https://api.vhtear.com/fbdl?link='+ body.slice(4) +'&apikey=' + vhtearkey)
            const epbe2 = `*「 FACEBOOK DOWNLOADER 」*\n➤ *Aplikasi*: Facebook`
            sagiri.sendFileFromUrl(from, resp.data.result.VideoUrl, `Facebook.mp4`, epbe2, id)
            } catch (err) {
                console.error(err.message)
                await sagiri.sendFileFromUrl(from, errorurl2, 'error.png', '💔️ Maaf, Video tidak ditemukan')
                sagiri.sendText(ownerNumber, 'Facebook Error : ' + err)
            }
            break
        case 'tiktok':
            if (args.length === 0) return sagiri.reply(from, 'Kirim perintah *!tiktok [linkTiktok]*\nContoh : *!tiktok https://vt.tiktok.com/yqyjPX/*', id)
            const tkdl = body.slice(8)
            sagiri.reply(from, '[ WAIT ] Sedang di proses⏳ silahkan tunggu sebentar', id)
            try {
                const titkod = await fetch(`https://api.vhtear.com/tiktokdl?link=${tkdl}&apikey=${vhtearkey}`)
                const tiktod = await titkod.json()
                if (tiktod.status == false) {
                    sagiri.reply(from, `*Maaf Terdapat kesalahan saat mengambil data, mohon pilih media lain...*`, id)
                } else {
                    const { Creator, video } = await tiktod.result
                    //sagiri.sendFileFromUrl(from, image, 'thumb.jpg', `*「 TIKTOK DOWNLOADER 」*\n\n➤ *Judul* : ${title}\n➤ Deskripsi : ${desk}\n➤ Durasi : ${duration}\n➤ Dibuat : ${dibuat}\n\n_Silahkan tunggu sebentar proses pengiriman video membutuhkan waktu beberapa menit._`, id)
                    sagiri.sendFileFromUrl(from, video, `${tkdl}.mp4`, `*「 TIKTOK DOWNLOADER 」*\n\n➤ *Creator* : ${Creator}`, id).catch(() => sagiri.reply(from, '[❗] Terjadi kesalahan, mungkin error di sebabkan oleh sistem.', id))
                }
            } catch (err) {
                sagiri.sendText(ownerNumber, 'Tiktok Download Error : '+ err)
                sagiri.reply(from, '[❗] Terjadi kesalahan, mungkin error di sebabkan oleh sistem.', id)
                console.log(err)
            }
            break
        case 'smule':
            if (args.length === 0) return sagiri.reply(from, 'Kirim perintah *!smule [linkSmule]*\nContoh : *!smule https://www.smule.com/p/767512225_3062360163*', id)
            sagiri.reply(from, '[ WAIT ] Sedang di proses⏳ silahkan tunggu sebentar', id)
            arg1 = body.trim().split(' ')
            console.log(...arg1[1])
            var slicedArgss = Array.prototype.slice.call(arg1, 1);
            console.log(slicedArgss)
            const sml = await slicedArgss.join(' ')
            console.log(sml)
            try {
            const resp = await axios.get('https://api.vhtear.com/getsmule?link=' + sml + '&apikey=' + vhtearkey)
            const { Type, title, url, image } = resp.data.result
            const sml3 = `*Music Ditemukan!*

➤ *Judul:* ${title}
➤ *Type:* ${Type}`

            sagiri.sendImage(from, image, `${title}.jpg`, sml3)
            sagiri.sendFileFromUrl(from, url, `${title}.mp3`, sml3, id)
            } catch (err) {
             console.error(err.message)
             await sagiri.sendFileFromUrl(from, errorurl2, 'error.png', '💔️ Maaf, Music tidak ditemukan')
             sagiri.sendText(ownerNumber, 'Smule Error : ' + err)
           }
          break
        case 'joox':
            if (args.length === 0) return sagiri.reply(from, 'Kirim perintah *!joox [judul]*\nContoh : *!joox Amanojaku*', id)
            sagiri.reply(from, '[ WAIT ] Sedang di proses⏳ silahkan tunggu sebentar', id)
            argq = body.trim().split(' ')
            console.log(...argq[1])
            var slicedArgs = Array.prototype.slice.call(argq, 1);
            console.log(slicedArgs)
            const music = await slicedArgs.join(' ')
            console.log(music)
            try {
            const music2 = await axios.get('https://api.vhtear.com/music?query=' + music + '&apikey=' + vhtearkey)
            const { penyanyi, judul, album, linkImg, linkMp3, filesize, ext, duration } = music2.data.result[0]
            const musik = `*User Ditemukan!*

➤ *Penyanyi:* ${penyanyi}
➤ *Judul:* ${judul}
➤ *Album:* ${album}
➤ *Ext:* ${ext}
➤ *Size:* ${filesize}
➤ *Durasi:* ${duration}`

            const pictk = await bent("buffer")(linkImg)
            const base64 = `data:image/jpg;base64,${pictk.toString("base64")}`
            sagiri.sendImage(from, base64, judul, musik)
            sagiri.sendFileFromUrl(from, linkMp3, `${judul}.mp3`, '', id)
            } catch (err) {
             console.error(err.message)
             await sagiri.sendFileFromUrl(from, errorurl2, 'error.png', '💔️ Maaf, Lagu tidak ditemukan')
             sagiri.sendText(ownerNumber, 'Error Joox : '+ err)
           }
          break
			
		//Primbon Menu
		case 'artinama':
			if (args.length == 0) return sagiri.reply(from, `Untuk mengetahui arti nama seseorang\nketik ${prefix}artinama Namanya`, id)
            rugaapi.artinama(body.slice(10))
			.then(async(res) => {
				await sagiri.reply(from, `Arti : ${res}`, id)
			})
            break
        case 'artimimpi':
            if (args.length === 0) return sagiri.reply(from, 'Kirim perintah *!artimimpi [mimpi]*\nContoh : *!artimimpi menikah*', id)
            try {
            const resp = await axios.get('https://api.vhtear.com/artimimpi?query=' + body.slice(11) + '&apikey=' + vhtearkey)
            if (resp.data.error) return sagiri.reply(from, resp.data.error, id)
            const anm2 = `➤ Artimimpi : ${resp.data.result.hasil}`
            sagiri.reply(from, anm2, id)
            } catch (err) {
                console.error(err.message)
                await sagiri.sendFileFromUrl(from, errorurl2, 'error.png', '💔️ Maaf, Mimpi tidak ditemukan')
                sagiri.sendText(ownerNumber, 'Artimimpi Error : ' + err)
           }
            break
		case 'cekjodoh':
			if (args.length !== 2) return sagiri.reply(from, `Untuk mengecek jodoh melalui nama\nketik: ${prefix}cekjodoh nama pasangan\n\ncontoh: ${prefix}cekjodoh aku kamu\n\nhanya bisa pakai nama panggilan (satu kata)`)
			rugaapi.cekjodoh(args[0],args[1])
			.then(async(res) => {
				await sagiri.sendFileFromUrl(from, `${res.link}`, '', `${res.text}`, id)
			})
            break
        case 'zodiak':
            if (args.length == 1) return sagiri.reply(from, `Untuk mengecek zodiak\nketik: ${prefix}zodiak nama tanggal\n\ncontoh: ${prefix}zodiak rizqi 07-05-2007\n\nhanya bisa pakai nama panggilan (satu kata)`)
			rugaapi.zodiak(args[0],args[1])
			.then(async(res) => {
				await sagiri.reply(from, res, id)
			})
			break
			
        // Random Kata
        case 'fakta':
            fetch('https://raw.githubusercontent.com/ArugaZ/grabbed-results/main/random/faktaunix.txt')
            .then(res => res.text())
            .then(body => {
                let splitnix = body.split('\n')
                let randomnix = splitnix[Math.floor(Math.random() * splitnix.length)]
                sagiri.reply(from, randomnix, id)
            })
            .catch(() => {
                sagiri.reply(from, 'Ada yang Error!', id)
            })
            break
        case 'katabijak':
            fetch('https://raw.githubusercontent.com/ArugaZ/grabbed-results/main/random/katabijax.txt')
            .then(res => res.text())
            .then(body => {
                let splitbijak = body.split('\n')
                let randombijak = splitbijak[Math.floor(Math.random() * splitbijak.length)]
                sagiri.reply(from, randombijak, id)
            })
            .catch(() => {
                sagiri.reply(from, 'Ada yang Error!', id)
            })
            break
        case 'pantun':
            fetch('https://raw.githubusercontent.com/ArugaZ/grabbed-results/main/random/pantun.txt')
            .then(res => res.text())
            .then(body => {
                let splitpantun = body.split('\n')
                let randompantun = splitpantun[Math.floor(Math.random() * splitpantun.length)]
                sagiri.reply(from, randompantun.replace(/aruga-line/g,"\n"), id)
            })
            .catch(() => {
                sagiri.reply(from, 'Ada yang Error!', id)
            })
            break
        case 'quote':
            const quotex = await rugaapi.quote()
            await sagiri.reply(from, quotex, id)
            .catch(() => {
                sagiri.reply(from, 'Ada yang Error!', id)
            })
            break
        case 'cerpen':
			rugaapi.cerpen()
			.then(async (res) => {
				await sagiri.reply(from, res.result, id)
			})
            break
        case 'puisi':
			rugaapi.puisi()
			.then(async (res) => {
				await sagiri.reply(from, res.result, id)
			})
            break
        //Random Images
        case 'nime':
            if (args.length == 0) return sagiri.reply(from, `Untuk menggunakan ${prefix}nime\nSilahkan ketik: ${prefix}nime [query]\nContoh: ${prefix}nime random\n\nquery yang tersedia:\nrandom, waifu, husbu, neko, loli`, id)
            if (args[0] == 'random' || args[0] == 'waifu' || args[0] == 'husbu' || args[0] == 'neko') {
                fetch('https://raw.githubusercontent.com/ArugaZ/grabbed-results/main/random/anime/' + args[0] + '.txt')
                .then(res => res.text())
                .then(body => {
                    let randomnime = body.split('\n')
                    let randomnimex = randomnime[Math.floor(Math.random() * randomnime.length)]
                    sagiri.sendFileFromUrl(from, randomnimex, '', 'Nih..', id)
                })
                .catch(() => {
                    sagiri.reply(from, 'Ada yang Error!', id)
                })
            } else if (args[0] == 'loli') {
                const loli = await axios.get(`https://api.vhtear.com/randomloli&apikey=${vhtearkey}`)
                const loly = loli.data.result
                sagiri.sendFileFromUrl(from, loly.result, 'loli.jpeg', '*LOLI*', id)
                break
            } else {
                sagiri.reply(from, `Maaf query tidak tersedia. Silahkan ketik ${prefix}nime untuk melihat list query`)
            }
            break
        case 'kpop':
            if (args.length == 0) return sagiri.reply(from, `Untuk menggunakan ${prefix}kpop\nSilahkan ketik: ${prefix}kpop [query]\nContoh: ${prefix}kpop bts\n\nquery yang tersedia:\nblackpink, exo, bts`, id)
            if (args[0] == 'blackpink' || args[0] == 'exo' || args[0] == 'bts') {
                fetch('https://raw.githubusercontent.com/ArugaZ/grabbed-results/main/random/kpop/' + args[0] + '.txt')
                .then(res => res.text())
                .then(body => {
                    let randomkpop = body.split('\n')
                    let randomkpopx = randomkpop[Math.floor(Math.random() * randomkpop.length)]
                    sagiri.sendFileFromUrl(from, randomkpopx, '', 'Nee..', id)
                })
                .catch(() => {
                    sagiri.reply(from, 'Ada yang Error!', id)
                })
            } else {
                sagiri.reply(from, `Maaf query tidak tersedia. Silahkan ketik ${prefix}kpop untuk melihat list query`)
            }
            break
        case 'memes':
            const randmeme = await meme.random()
            sagiri.sendFileFromUrl(from, randmeme, '', '', id)
            .catch(() => {
                sagiri.reply(from, 'Ada yang Error!', id)
            })
            break
        
        //Rimuru Bot
        case 'req':
            sagiri.sendContact(from, '6288228820641@c.us')
            sagiri.sendText(from, 'Ketik /rimuru di Bot Rimuru')
            break

        // Search Any
        case 'images':
            if (args.length == 0) return sagiri.reply(from, `Untuk mencari gambar di pinterest\nketik: ${prefix}images [search]\ncontoh: ${prefix}images sagiri`, id)
            const cariwall = body.slice(8)
            const hasilwall = await images.fdci(cariwall)
            await sagiri.sendFileFromUrl(from, hasilwall, '', '', id)
            .catch(() => {
                sagiri.reply(from, 'Ada yang Error!', id)
            })
            break
        case 'sr':
            if (args.length == 0) return sagiri.reply(from, `Untuk mencari gambar di sub reddit\nketik: ${prefix}sr [search]\ncontoh: ${prefix}sr sagiri`, id)
            const carireddit = body.slice(9)
            const hasilreddit = await images.sreddit(carireddit)
            await sagiri.sendFileFromUrl(from, hasilreddit, '', '', id)
            .catch(() => {
                sagiri.reply(from, 'Ada yang Error!', id)
            })
	    break
        case 'resep':
            if (args.length == 0) return sagiri.reply(from, `Untuk mencari resep makanan\nCaranya ketik: ${prefix}resep [search]\n\ncontoh: ${prefix}resep tahu`, id)
            const cariresep = body.slice(7)
            const hasilresep = await resep.resep(cariresep)
            await sagiri.reply(from, hasilresep + '\n\nIni resep makanannya..', id)
            .catch(() => {
                sagiri.reply(from, 'Ada yang Error!', id)
            })
            break
        case 'nekopoi':
            //sagiri.sendText(from, `Gomenne, Sagiri masih di bawah umur`)
            rugapoi.getLatest()
            .then((result) => {
                rugapoi.getVideo(result.link)
                .then((res) => {
                    let heheq = '\n'
                    for (let i = 0; i < res.links.length; i++) {
                        heheq += `${res.links[i]}\n`
                    }
                    sagiri.reply(from, `Title: ${res.title}\n\nLink:\n${heheq}\nmasih tester bntr :v`)
                })
            })
            .catch(() => {
                sagiri.reply(from, 'Ada yang Error!', id)
            })
            break
        case 'nhview':
            //sagiri.reply(from, 'Sedang dalam perbaikan')
            if (!isGroupMsg) return sagiri.reply(from, 'Perintah ini hanya bisa di gunakan dalam group!', id)
            if (args.length === 0) return sagiri.reply(from, 'Kirim perintah *!nhview [212121]*\nContoh : *!nhview 321421*', id)
            const nhsh = args[0]
            const nhsh2 = await axios.get('https://mnazria.herokuapp.com/api/nhentai?code='+nhsh)
            for (let i = 0; i < nhsh2.length; i++) {
                await sagiri.sendImage(from, nhsh2[i].data, 'thumbserc.jpg', '', id)
                }
            break
        case 'nhder':
            if (args.length >=1){
                const code = args[0]
                const url = 'https://nhder.herokuapp.com/download/nhentai/'+code+'/zip'
                const short = []
                const shortener = await urlShortener(url)
                url['short'] = shortener
                short.push(url)
                const caption = `*DOUJIN DOWNLOADER*\n\nLink: ${shortener}\n\nCara: Tekan linknya, nanti langsung kedownload`
                sagiri.sendText(from, caption)
                sagiri.sendText(from, 'Dosa ditanggung sendiri')
            } else {
                sagiri.sendText(from, 'Kore nani? tolong masukan code nuclear')
            }
            break
        case 'cerita18':
        case 'ceritasex':
            rugaapi.cerita18()
			.then(async (res) => {
                await sagiri.reply(from, res, id)
                sagiri.sendText(from, 'Dosa ditanggung sendiri')
			})
			break
        case 'video18':
        case 'videohot':
        case 'videosex':
            //sagiri.reply(from, 'Fitur ini sedang dalam perbaikan')
            const videom18 = await rugaapi.video18()
            await sagiri.reply(from, videom18, id)
                sagiri.reply(from, 'Dosa ditanggung sendiri')
            .catch(() => {
                sagiri.reply(from, 'Ada yang Error!', id)
            })
            break
        case 'igstalk':
            if (args.length === 0)  return sagiri.reply(from, 'Kirim perintah *!igstalk username*\nContoh *!igstalk lyflaz*', id)
            arg3 = body.trim().split(' ')
            console.log(...arg3[1])
            var slicedArgs = Array.prototype.slice.call(arg3, 1);
            console.log(slicedArgs)
            const istalk = await slicedArgs.join(' ')
            console.log(istalk)
            try {
            const istalk2 = await axios.get('https://api.vhtear.com/igprofile?query=' + istalk + '&apikey=' + vhtearkey)
            const { biography, follower, follow, picture, post_count, full_name, username, is_private } = istalk2.data.result
            const istalk3 = `*User Ditemukan!*

➤ *Username:* ${username}
➤ *Nama:* ${full_name}
➤ *Bio:* ${biography}
➤ *Mengikuti:* ${follow}
➤ *Pengikut:* ${follower}
➤ *Jumlah Postingan:* ${post_count}
➤ *Private:* ${is_private}`
            
            const pictk = await bent("buffer")(picture)
            const base64 = `data:image/jpg;base64,${pictk.toString("base64")}`
            sagiri.sendImage(from, base64, username, istalk3)
            } catch (err) {
             console.error(err.message)
             await sagiri.sendFileFromUrl(from, errorurl2, 'error.png', '💔️ Maaf, User tidak ditemukan')
             sagiri.sendText(ownerNumber, 'Igstalk Error : ' + err)
           }
          break
        case 'tiktokstalk':
            if (args.length === 0)  return sagiri.reply(from, 'Kirim perintah *!tiktokstalk @username*\nContoh *!tiktokstalk @riaricis*', id)
            sagiri.reply(from, 'Fitur ini sedang di perbaiki')
            arg4 = body.trim().split(' ')
            console.log(...arg4[1])
            var slicedArgs = Array.prototype.slice.call(arg4, 1);
            console.log(slicedArgs)
            const tstalk = await slicedArgs.join(' ')
            console.log(tstalk)
            try {
            const tstalk2 = await axios.get('https://api.vhtear.com/tiktokprofile?query=' + tstalk + '&apikey=' + vhtearkey)
            const { username, bio, follow, follower, title, like_count, video_post, description, picture, url_account } = tstalk2.data.result
            const tiktod = `*User Ditemukan!*
➤ *Username:* ${username}
➤ *Judul:* ${title}
➤ *Bio:* ${bio}
➤ *Mengikuti:* ${follow}
➤ *Pengikut:* ${follower}
➤ *Jumlah Like*: ${like_count}
➤ *Jumlah Postingan:* ${video_post}
➤ *Deskripsi:* ${description}
➤ *Link:* ${url_account}`

            const pictk = await bent("buffer")(picture)
            const base64 = `data:image/jpg;base64,${pictk.toString("base64")}`
            sagiri.sendImage(from, base64, title, tiktod)
            } catch (err) {
             console.error(err.message)
             await sagiri.sendFileFromUrl(from, errorurl2, 'error.png', '💔️ Maaf, User tidak ditemukan')
             sagiri.sendText(ownerNumber, 'Error Tiktokstalk : '+ err)
           }
          break
        case 'smulestalk':
            if (args.length === 0) return sagiri.reply(from, 'Kirim perintah *!smulestalk @username*\nContoh : *!smulestalk loli*', id)
            arg5 = body.trim().split(' ')
            console.log(...arg5[1])
            var slicedArgs = Array.prototype.slice.call(arg5, 1);
            console.log(slicedArgs)
            const sstalk = await slicedArgs.join(' ')
            console.log(sstalk)
            try {
            const sstalk2 = await axios.get('https://api.vhtear.com/smuleprofile?query=' + sstalk + '&apikey=' + vhtearkey)
            const { username, full_name, follower, follow, biography, is_vip, picture, recording } = sstalk2.data.result
            const smule = `*User Ditemukan!*
➤ *Username:* ${username}
➤ *Full Name:* ${full_name}
➤ *Biografi:* ${biography}
➤ *Mengikuti:* ${follow}
➤ *Pengikut:* ${follower}
➤ *VIP*: ${is_vip}
➤ *Total Rekaman:* ${recording}`

            const pictk = await bent("buffer")(picture)
            const base64 = `data:image/jpg;base64,${pictk.toString("base64")}`
            sagiri.sendImage(from, base64, full_name, smule)
            } catch (err) {
             console.error(err.message)
             await sagiri.sendFileFromUrl(from, errorurl2, 'error.png', '💔️ Maaf, User tidak ditemukan')
             sagiri.sendText(ownerNumber, 'Error Smulestalk : '+ err)
            }
          break
        case 'wiki':
            if (args.length == 0) return sagiri.reply(from, `Untuk mencari suatu kata dari wikipedia\nketik: ${prefix}wiki [kata]`, id)
            const wikip = body.slice(6)
            const wikis = await rugaapi.wiki(wikip)
            await sagiri.reply(from, wikis, id)
            .catch(() => {
                sagiri.reply(from, 'Ada yang Error!', id)
            })
            break
        case 'kbbi':
            if (args.length === 0) return sagiri.reply(from, 'Kirim perintah *!kbbi [query]*\nContoh : *!kbbi lagu*', id)
            const kbbl = body.slice(6)
            const kbbl2 = await axios.get(`https://mnazria.herokuapp.com/api/kbbi?search=${kbbl}`)

            if (kbbl2.data.error) {
                sagiri.reply(from, kbbl2.data.error, id)
            } else {
                sagiri.sendText(from, `➸ *Query* : ${kbbl}\n\n➸ *Result* : ${kbbl2.data.result}`, id)
            }
            break
        case 'google':
            const google = require('google-it')
            sagiri.reply(from, '[ WAIT ] Sedang di proses⏳ silahkan tunggu sebentar', id)
            const googleQuery = body.slice(8)
            if(googleQuery == undefined || googleQuery == ' ') return sagiri.reply(from, `*Hasil Pencarian : ${googleQuery}* tidak ditemukan`, id)
            google({ 'query': googleQuery }).then(results => {
            let vars = `_*Hasil Pencarian : ${googleQuery}*_\n`
            for (let i = 0; i < results.length; i++) {
                vars +=  `\n─────────────────\n\n*Judul* : ${results[i].title}\n\n*Deskripsi* : ${results[i].snippet}\n\n*Link* : ${results[i].link}\n\n`
            }
                sagiri.reply(from, vars, id);
            }).catch(e => {
                console.log(e)
                sagiri.sendText(ownerNumber, 'Google Error : ' + e);
            })
            break
        case 'cuaca':
            if (args.length == 0) return sagiri.reply(from, `Untuk melihat cuaca pada suatu daerah\nketik: ${prefix}cuaca [daerah]`, id)
            const cuacaq = body.slice(7)
            const cuacap = await rugaapi.cuaca(cuacaq)
            await sagiri.reply(from, cuacap, id)
            .catch(() => {
                sagiri.reply(from, 'Ada yang Error!', id)
            })
            break
		case 'lirik':
			if (args.length == 0) return sagiri.reply(from, `Untuk mencari lirik dari sebuah lagu\bketik: ${prefix}chord [judul_lagu]`, id)
			rugaapi.lirik(body.slice(7))
			.then(async (res) => {
				await sagiri.reply(from, `Lirik Lagu: ${body.slice(7)}\n\n${res}`, id)
			})
			break
        case 'chord':
            if (args.length == 0) return sagiri.reply(from, `Untuk mencari lirik dan chord dari sebuah lagu\bketik: ${prefix}chord [judul_lagu]`, id)
            const chordq = body.slice(7)
            const chordp = await rugaapi.chord(chordq)
            await sagiri.reply(from, chordp, id)
            .catch(() => {
                sagiri.reply(from, 'Ada yang Error!', id)
            })
            break
        case 'ss': //jika error silahkan buka file di folder settings/api.json dan ubah apiSS 'API-KEY' yang kalian dapat dari website https://apiflash.com/
            if (args.length == 0) return sagiri.reply(from, `Membuat bot men-screenshot sebuah web\n\nPemakaian: ${prefix}ss [url]\n\ncontoh: ${prefix}ss http://google.com`, id)
            const scrinshit = await meme.ss(args[0])
            await sagiri.sendFile(from, scrinshit, 'ss.jpg', 'Kore, matte gomennasai...', id)
            .catch(() => {
                sagiri.reply(from, 'Ada yang Error!', id)
            })
            break
        case 'play'://silahkan kalian custom sendiri jika ada yang ingin diubah
        if (args.length == 0) return sagiri.reply(from, `Untuk mencari lagu dari youtube\n\nPenggunaan: ${prefix}play judul lagu`, id)
        try {
            sagiri.reply(from, '[ WAIT ] Sedang di proses⏳ silahkan tunggu sebentar', id)
            const serplay = body.slice(6)
            const webplay = await fetch(`https://api.vhtear.com/ytmp3?query=${serplay}&apikey=${vhtearkey}`)
            if (!webplay.ok) throw new Error(`Error Get Video : ${webplay.statusText}`)
            const webplay2 = await webplay.json()
             if (webplay2.status == false) {
                sagiri.reply(from, `*Maaf Terdapat kesalahan saat mengambil data, mohon pilih media lain...*`, id)
            } else {
                //if (Number(webplay2.result.size.split(' MB')[0]) >= 10.00) return sagiri.reply(from, 'Maaf ukuran music melebihi batas, maksimal 10 MB!', id)
                const { image, mp3, size, ext, title, duration } = await webplay2.result
                const captplay = `*「 PLAY 」*\n\n• *Judul* : ${title}\n• *Durasi* : ${duration}\n• *Filesize* : ${size}\n• *Exp* : ${ext}\n\n_*Music Sedang Dikirim*_`
                sagiri.sendFileFromUrl(from, image, `thumb.jpg`, captplay, id)
                await sagiri.sendFileFromUrl(from, mp3, `${title}.mp3`, '', id).catch(() => sagiri.reply(from, '[❗] Terjadi kesalahan, mungkin error di sebabkan oleh sistem.', id))
            }
        } catch (err) {
            sagiri.sendText(ownerNumber, 'Error Play : '+ err)
            sagiri.reply(from, '[❗] Terjadi kesalahan, tidak dapat meng konversi ke mp3!', id)
        }
        break
        case 'movie':
			if (args.length == 0) return sagiri.reply(from, `Untuk mencari suatu movie dari website sdmovie.fun\nketik: ${prefix}movie judulnya`, id)
			rugaapi.movie((body.slice(7)))
			.then(async (res) => {
				if (res.status == 'error') return sagiri.reply(from, res.hasil, id)
				await sagiri.sendFileFromUrl(from, res.link, 'movie.jpg', res.hasil, id)
			})
			break
        case 'sauce':
            if (isMedia && type === 'image' || quotedMsg && quotedMsg.type === 'image') {
                if (isMedia) {
                    var mediaData = await decryptMedia(message, uaOverride)
                } else {
                    var mediaData = await decryptMedia(quotedMsg, uaOverride)
                }
                const fetch = require('node-fetch')
                const imgBS4 = `data:${mimetype};base64,${mediaData.toString('base64')}`
                sagiri.reply(from, 'Searching....', id)
                fetch('https://trace.moe/api/search', {
                    method: 'POST',
                    body: JSON.stringify({ image: imgBS4 }),
                    headers: { "Content-Type": "application/json" }
                })
                .then(respon => respon.json())
                .then(resolt => {
                	if (resolt.docs && resolt.docs.length <= 0) {
                		sagiri.reply(from, 'Maaf, saya tidak tau ini anime apa, pastikan gambar yang akan di Search tidak Buram/Kepotong', id)
                	}
                    const { is_adult, title, title_chinese, title_romaji, title_english, episode, similarity, filename, at, tokenthumb, anilist_id } = resolt.docs[0]
                    teks = ''
                    if (similarity < 0.92) {
                    	teks = '*Saya memiliki keyakinan rendah dalam hal ini* :\n\n'
                    }
                    teks += '╭───────────•◈•───────────╮\n\n'
                    teks += `⠀⠀⠀⠀ 🏮 *Japanese:* ${title}\n            🐉 *Romaji:* ${title_romaji}\n            🎬 *English:* ${title_english}\n`
                    teks += `⠀⠀⠀⠀🔥 *Ecchi:* ${is_adult}\n`
                    teks += `⠀⠀⠀⠀🍃 *Episodes:* ${episode.toString()}\n`
                    teks += `⠀⠀      🌿 *Kesamaan:* ${(similarity * 100).toFixed(1)}%\n`
                    teks += '\n╰───────────•◈•───────────╯'
                    var video = `https://media.trace.moe/video/${anilist_id}/${encodeURIComponent(filename)}?t=${at}&token=${tokenthumb}`;
                    sagiri.sendFileFromUrl(from, video, 'anime.mp4', teks, id).catch(() => {
                        sagiri.reply(from, teks, id)
                    })
                })
                .catch(() => {
                    sagiri.reply(from, 'Ada yang Error!', id)
                })
            } else {
				sagiri.reply(from, `Maaf format salah\n\nSilahkan kirim foto dengan caption ${prefix}sauce\n\nAtau reply foto dengan caption ${prefix}sauce`, id)
			}
            break
            
        case 'anime':
            if (args.length == 0) return sagiri.reply(from, `Untuk mencari anime\nketik ${prefix}anime judul\nContoh: ${prefix}anime domestic na kanojo`, id)
            const animenya = body.slice(7)
            const anime = await rugaapi.anime(animenya)
            const animepict = await rugaapi.animepict(animenya)
            await sagiri.sendFileFromUrl(from, animepict, '', anime, id)
            .catch(() => {
                sagiri.reply(from, 'Ada yang Error!', id)
            })
            break
            
        // Other Command
        case 'resi':
            if (args.length !== 2) return sagiri.reply(from, `Maaf, format pesan salah.\nSilahkan ketik pesan dengan ${prefix}resi <kurir> <no_resi>\n\nKurir yang tersedia:\njne, pos, tiki, wahana, jnt, rpx, sap, sicepat, pcp, jet, dse, first, ninja, lion, idl, rex`, id)
            const kurirs = ['jne', 'pos', 'tiki', 'wahana', 'jnt', 'rpx', 'sap', 'sicepat', 'pcp', 'jet', 'dse', 'first', 'ninja', 'lion', 'idl', 'rex']
            if (!kurirs.includes(args[0])) return sagiri.sendText(from, `Maaf, jenis ekspedisi pengiriman tidak didukung layanan ini hanya mendukung ekspedisi pengiriman ${kurirs.join(', ')} Tolong periksa kembali.`)
            console.log('Memeriksa No Resi', args[1], 'dengan ekspedisi', args[0])
            cekResi(args[0], args[1]).then((result) => sagiri.sendText(from, result))
            break
        case 'qrcode':
            //sagiri.reply(from, 'Sedang dalam perbaikan')
            if(!args.lenght == 0) return sagiri.reply(from, `Mengubah teks menjadi kode QR\nketik ${prefix}qrcode\nContoh: ${prefix}qrcode halo`)
            let qrcodes = body.slice(8)
            await sagiri.sendFileFromUrl(from, `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${qrcodes}`, 'gambar.png', 'Process sukses!')
            break
        case 'tts':
            if (args.length == 0) return sagiri.reply(from, `Mengubah teks menjadi sound (google voice)\nketik: ${prefix}tts <kode_bahasa> <teks>\ncontoh : ${prefix}tts id halo\nuntuk kode bahasa ketik !bahasa`)
            const ttsGB = require('node-gtts')(args[0])
            const dataText = body.slice(8)
                if (dataText === '') return sagiri.reply(from, 'mana teksnya ba-baka!', id)
                try {
                    ttsGB.save('./media/tts.mp3', dataText, function () {
                    sagiri.sendPtt(from, './media/tts.mp3', id)
                    })
                } catch (err) {
                    sagiri.reply(from, err, id)
                }
            break
        case 'bahasa':
            await sagiri.sendText(from, menuId.textBahasa())
            break
        case 'translate':
            if (args.length != 1) return sagiri.reply(from, `Maaf, format pesan salah.\nSilahkan reply sebuah pesan dengan caption ${prefix}translate <kode_bahasa>\ncontoh ${prefix}translate id`, id)
            if (!quotedMsg) return sagiri.reply(from, `Maaf, format pesan salah.\nSilahkan reply sebuah pesan dengan caption ${prefix}translate <kode_bahasa>\ncontoh ${prefix}translate id`, id)
            const quoteText = quotedMsg.type == 'chat' ? quotedMsg.body : quotedMsg.type == 'image' ? quotedMsg.caption : ''
            translate(quoteText, args[0])
                .then((result) => sagiri.sendText(from, result))
                .catch(() => sagiri.sendText(from, 'Error, Kode bahasa salah.'))
            break
        case 'profile':
            const topdon = '62895614808517'
            const donatur = '60105185875'
            const istopdon = topdon+'@c.us' == sender.id
            const isdonatur = donatur+'@c.us' == sender.id
            var role = 'User'
            /*if (iscahyo) {
                var role = 'Special User'
            }*/
            if (isOwnerBot) {
                var role = 'Bot Owner'
            }
            if (istopdon) {
                var role = 'Top Donate'
            }
            if (isdonatur) {
                var role = 'Donatur'
            }
            if (isGroupMsg) {
              if (!quotedMsg) {
              var block = banned.includes(author)
              var pic = await sagiri.getProfilePicFromServer(author)
              var namae = pushname
              var sts = await sagiri.getStatus(author)
              var adm = isGroupAdmins
              const { status } = sts
               if (pic == undefined) {
               var pfp = errorurl2
               } else {
               var pfp = pic
               } 
             await sagiri.sendFileFromUrl(from, pfp, 'pfp.jpg', `*User Profile* ✨️ \n\n 🔖️ *Username: ${namae}*\n\n💌️ *User Info: ${status}*\n\n💔️ *Ban: ${block}*\n\n✨️ *Role: ${role}*\n\n 👑️ *Admin: ${adm}*`)
             } else if (quotedMsg) {
             var qmid = quotedMsgObj.sender.id
             var block = banned.includes(qmid)
             var pic = await sagiri.getProfilePicFromServer(qmid)
             var namae = quotedMsgObj.sender.name
             var sts = await sagiri.getStatus(qmid)
             const senid = quotedMsgObj.sender.id
             console.log(quotedMsgObj.sender.id)
             var adm = isGroupAdmins
             const { status } = sts
             if (senid == '6281358181668@c.us') {
                var rolee = 'Bot Owner'
             } else if (senid == '12238487998@c.us') { // NOMER BOTNYA
                 var rolee = 'Bot'
             } else if (senid == '62895614808517@c.us') {
                 var rolee = 'Top Donate'
             } else if (senid == '60105185875@c.us') {
                 var rolee = 'Donatur'
             } else {
                 var rolee = 'User'
                }
              if (pic == undefined) {
              var pfp = errorurl2
              } else {
              var pfp = pic
              } 
             await sagiri.sendFileFromUrl(from, pfp, 'pfo.jpg', `*User Profile* ✨️ \n\n 🔖️ *Username: ${namae}*\n💌️ *User Info: ${status}*\n*💔️ Ban: ${block}*\n✨️ *Role: ${rolee}*\n 👑️ *Admin: ${adm}*`)
             }
            }
            break
		case 'covidindo':
			rugaapi.covidindo()
			.then(async (res) => {
				await sagiri.reply(from, `${res}`, id)
			})
			break
        case 'ceklokasi':
            if (quotedMsg.type !== 'location') return sagiri.reply(from, `Maaf, format pesan salah.\nKirimkan lokasi dan reply dengan caption ${prefix}ceklokasi`, id)
            console.log(`Request Status Zona Penyebaran Covid-19 (${quotedMsg.lat}, ${quotedMsg.lng}).`)
            const zoneStatus = await getLocationData(quotedMsg.lat, quotedMsg.lng)
            if (zoneStatus.kode !== 200) sagiri.sendText(from, 'Maaf, Terjadi error ketika memeriksa lokasi yang anda kirim.')
            let datax = ''
            for (let i = 0; i < zoneStatus.data.length; i++) {
                const { zone, region } = zoneStatus.data[i]
                const _zone = zone == 'green' ? 'Hijau* (Aman) \n' : zone == 'yellow' ? 'Kuning* (Waspada) \n' : 'Merah* (Bahaya) \n'
                datax += `${i + 1}. Kel. *${region}* Berstatus *Zona ${_zone}`
            }
            const text = `*CEK LOKASI PENYEBARAN COVID-19*\nHasil pemeriksaan dari lokasi yang anda kirim adalah *${zoneStatus.status}* ${zoneStatus.optional}\n\nInformasi lokasi terdampak disekitar anda:\n${datax}`
            sagiri.sendText(from, text)
            break
        case 'maps':
            if (typeof Array.prototype.splice === 'undefined') {
                Array.prototype.splice = function (index, howmany, elemes) {
                    howmany = typeof howmany === 'undefined' || this.length;
                    var elems = Array.prototype.slice.call(arguments, 2), newArr = this.slice(0, index), last = this.slice(index + howmany);
                    newArr = newArr.concat.apply(newArr, elems);
                    newArr = newArr.concat.apply(newArr, last);
                    return newArr;
                }
            }
            //sagiri.reply(from, 'Sedang dalam perbaikan')
            if (args.length === 0) return sagiri.reply(from, 'Kirim perintah *!maps [optional]*, Contoh : *!maps Jombang*')
            console.log(...args[0])
            var slicedArgs = Array.prototype.slice.call(argz, 1);
            console.log(slicedArgs)
            const mapz = await slicedArgs.join(' ')
            console.log(mapz)
            try {
            const mapz2 = await axios.get('https://mnazria.herokuapp.com/api/maps?search=' + mapz)
            const { gambar } = mapz2.data
            const pictk = await bent("buffer")(gambar)
            const base64 = `data:image/jpg;base64,${pictk.toString("base64")}`
            sagiri.sendImage(from, base64, 'maps.jpg', `*Hasil Maps : ${mapz}*`)
            } catch (err) {
             console.error(err.message)
             await sagiri.sendFileFromUrl(from, errorurl2, 'error.png', '💔️ Maaf, User tidak ditemukan')
             sagiri.sendText(ownerNumber, 'Error Maps : '+ err)
           }
          break
        case 'checkip':
        case 'cekip':
            //sagiri.reply(from, 'Fitur ini dalam perbaikan')
            if (args.length === 0) return sagiri.reply(from, 'Kirim perintah *!checkip [ipaddress]*\nContoh : *!checkip 182.0.144.145*', id)
            sagiri.reply(from, 'Tunggu sebentar...', id)
            console.log(...argz[1])
            var slicedArgs = Array.prototype.slice.call(argz, 1);
            console.log(slicedArgs)
            const cekip = await slicedArgs.join(' ')
            console.log(cekip)
            try {
            const cekip2 = await axios.get('https://mnazria.herokuapp.com/api/check?ip=' + cekip)
            const { city, continent_name, country_name, ip, latitude, location, longitude, region_name } = cekip2.data
            const cekip3 = `*User Ditemukan!*

➸ *Kota:* ${city}
➸ *Benua:* ${continent_name}
➸ *Negara:* ${country_name}
➸ *Ip Address:* ${ip}
➸ *Garis Lintang:* ${latitude}
➸ *Kode Telepon:* +${location.calling_code}
➸ *Ibu Kota:* +${location.capital}
➸ *Bahasa:* +${location.languages[0].name}
➸ *Garis Bujur:* ${longitude}
➸ *Wilayah:* +${region_name}`

            const pictk = await bent("buffer")(location.country_flag)
            const base64 = `data:image/jpg;base64,${pictk.toString("base64")}`
            sagiri.sendImage(from, base64, city, cekip3)
            } catch (err) {
             console.error(err.message)
             await sagiri.sendFileFromUrl(from, errorurl2, 'error.png', '💔️ Maaf, User tidak ditemukan')
             sagiri.sendText(ownerNumber, 'Error Check IP : '+ err)
           }
          break
        case 'bmkg':
            const parseString = require('xml2js').parseString;
            axios.get('https://data.bmkg.go.id/autogempa.xml').then((res) => {
                parseString(res.data, function (err, result) {
                result = result.Infogempa.gempa[0];
                let hasils = `_*Informasi Gempa BMKG*_
~> Tanggal : ${result.Tanggal}
~> Jam : ${result.Jam}
~> Magnitudo : ${result.Magnitude}
~> Kedalaman : ${result.Kedalaman}
~> Lintang : ${result.Lintang}
~> Bujur : ${result.Bujur}
~> Lokasi 1 : ${result.Wilayah1}
~> Lokasi 2 : ${result.Wilayah2}
~> Lokasi 3 : ${result.Wilayah3}
~> Lokasi 4 : ${result.Wilayah4}
~> Lokasi 5 : ${result.Wilayah5}
~> Potensi : ${result.Potensi}
`
                sagiri.sendText(from, hasils)
                });})
            break
        case 'shortlink':
            if (args.length == 0) return sagiri.reply(from, `ketik ${prefix}shortlink <url>`, id)
            if (!isUrl(args[0])) return sagiri.reply(from, 'Maaf, url yang kamu kirim tidak valid.', id)
            const shortlink = await urlShortener(args[0])
            await sagiri.sendText(from, shortlink)
            .catch(() => {
                sagiri.reply(from, 'Ada yang Error!', id)
            })
            break
		case 'alay':
			if (args.length == 0) return sagiri.reply(from, `Mengubah kalimat menjadi alayyyyy\n\nketik ${prefix}alay kalimat`, id)
			rugaapi.bapakfont(body.slice(6))
			.then(async(res) => {
				await sagiri.reply(from, `${res}`, id)
			})
            break
        case 'read': 
            if (!isGroupMsg) return sagiri.reply(from, 'Perintah ini hanya bisa di gunakan dalam group!', id)                
            if (!quotedMsg) return sagiri.reply(from, 'Balas/reply pesan Sagiri', id)
            if (!quotedMsgObj.fromMe) return sagiri.reply(from, 'Balas/reply pesan Sagiri', id)
            try {
                const reader = await sagiri.getMessageReaders(quotedMsgObj.id)
                let list = ''
                for (let pembaca of reader) {
                list += `- @${pembaca.id.replace(/@c.us/g, '')}\n` 
                }
                sagiri.sendTextWithMentions(from, `Hayolo yang ngeread doang\n${list}`)
            } catch(err) {
                console.log(err)
                sagiri.reply(from, 'Belum ada yang membaca pesan Sagiri ', id)    
            }
        break
		
		//Fun Menu
		case 'klasmen':
			if (!isGroupMsg) return sagiri.reply(from, 'Maaf, perintah ini hanya dapat dipakai didalam grup!', id)
			const klasemen = db.get('group').filter({id: groupId}).map('members').value()[0]
            let urut = Object.entries(klasemen).map(([key, val]) => ({id: key, ...val})).sort((a, b) => b.denda - a.denda);
            let textKlas = "*Klasemen Denda Sementara*\n"
            let i = 1;
            urut.forEach((klsmn) => {
            textKlas += i+". @"+klsmn.id.replace('@c.us', '')+" ➤ Rp"+formatin(klsmn.denda)+"\n"
            i++
            });
            await sagiri.sendTextWithMentions(from, textKlas)
            break
        case 'text':
        case 'teks':
            if (args[0] === 'add') {
                const textran = JSON.parse(fs.readFileSync('./lib/textran.json'))
                const apalu = body.slice(10)
                textran.push(apalu)
                fs.writeFileSync('./lib/textran.json', JSON.stringify(textran))
                sagiri.reply(from, `Sukses, menambahkan kata2 ke database`, id) 
            } else {
            const textapaan = JSON.parse(fs.readFileSync('./lib/textran.json'))
            let randompun = textapaan[Math.floor(Math.random() * textapaan.length)]
                sagiri.reply(from, randompun)
            }
            break
        case 'caklontong':
            try {
            const resp = await axios.get('https://api.vhtear.com/funkuis&apikey=' + vhtearkey)
            if (resp.data.error) return sagiri.reply(from, resp.data.error, id)
            const anm2 = `╭┈──── Soal : ${resp.data.result.soal}\n╰─➤ Deskripsi : ${resp.data.result.desk}\n╰─➤ Poin : ${resp.data.result.poin}`
            const jwban = `➤ Jawaban : ${resp.data.result.jawaban}`
            sagiri.reply(from, anm2, id)
            sagiri.sendText(from, `30 Detik Lagi...`, id)
            await sleep(10000)
            sagiri.sendText(from, `20 Detik Lagi...`, id)
            await sleep(10000)
            sagiri.sendText(from, `10 Detik Lagi...`, id)
            await sleep(10000)
            sagiri.reply(from, jwban, id)
            } catch (err) {
                console.error(err.message)
                await sagiri.sendFileFromUrl(from, errorurl2, 'error.png', '💔️ Maaf, Soal Quiz tidak ditemukan')
                sagiri.sendText(ownerNumber, 'Caklontong Error : ' + err)
           }
           break
        case 'tebakgambar':
            try {
            const resp = await axios.get('https://api.vhtear.com/tebakgambar&apikey=' + vhtearkey)
            if (resp.data.error) return sagiri.reply(from, resp.data.error, id)
            const jwban = `➤ Jawaban : ${resp.data.result.jawaban}`
            await sagiri.sendFileFromUrl(from, resp.data.result.soalImg, 'tebakgambar.jpg', '_Silahkan Jawab Maksud Dari Gambar Ini_', id)
            sagiri.sendText(from, `30 Detik Lagi...`, id)
            await sleep(10000)
            sagiri.sendText(from, `20 Detik Lagi...`, id)
            await sleep(10000)
            sagiri.sendText(from, `10 Detik Lagi...`, id)
            await sleep(10000)
            sagiri.reply(from, jwban, id)
            } catch (err) {
                console.error(err.message)
                await sagiri.sendFileFromUrl(from, errorurl2, 'error.png', '💔️ Maaf, Soal Quiz tidak ditemukan')
                sagiri.sendText(ownerNumber, 'Tebak Gambar Error : ' + err)
           }
           break
        case 'family100':
            try {
            const resp = await axios.get('https://api.vhtear.com/family100&apikey=' + vhtearkey)
            if (resp.data.error) return sagiri.reply(from, resp.data.error, id)
            const anm2 = `➤ Soal : ${resp.data.result.soal}\n_Silahkan DiJawab_`
            const jwban = `➤ Jawaban : ${resp.data.result.jawaban}`
            sagiri.reply(from, anm2, id)
            sagiri.sendText(from, `30 Detik Lagi...`, id)
            await sleep(10000)
            sagiri.sendText(from, `20 Detik Lagi...`, id)
            await sleep(10000)
            sagiri.sendText(from, `10 Detik Lagi...`, id)
            await sleep(10000)
            sagiri.reply(from, jwban, id)
            } catch (err) {
                console.error(err.message)
                await sagiri.sendFileFromUrl(from, errorurl2, 'error.png', '💔️ Maaf, Soal Quiz tidak ditemukan')
                sagiri.sendText(ownerNumber, 'Family100 Error : ' + err)
           }
           break
        case 'heroml':
            if (args.length === 0) return sagiri.reply(from, 'Kirim perintah *!heroml [nama hero]*\nContoh : *!heroml alucard*', id)
            try {
            const resp = await axios.get('https://api.vhtear.com/herodetail?query=' + body.slice(8) + '&apikey=' + vhtearkey)
            if (resp.data.error) return sagiri.reply(from, resp.data.error, id)
            const anm2 = `➤ Title : ${resp.data.result.title}\n➤ Quotes : ${resp.data.result.quotes}\n➤ Info : ${resp.data.result.info}\n➤ Atribut : ${resp.data.result.attributes}`
            sagiri.sendFileFromUrl(from, resp.data.result.pictHero, 'hero.jpg', anm2, id)
            } catch (err) {
                console.error(err.message)
                await sagiri.sendFileFromUrl(from, errorurl2, 'error.png', '💔️ Maaf, Hero tidak ditemukan')
                sagiri.sendText(ownerNumber, 'Heroml Error : ' + err)
           }
            break
        case 'math':
            const Math_js = require('mathjs');
            if (args.length === 0) return sagiri.reply(from, '[❗] Kirim perintah *!math [ Angka ]*\nContoh : !math 12*12\n*NOTE* :\n- Untuk Perkalian Menggunakan *\n- Untuk Pertambahan Menggunakan +\n- Untuk Pengurangan Mennggunakan -\n- Untuk Pembagian Menggunakan /')
            const mtk = body.slice(6)
            if (typeof Math_js.evaluate(mtk) !== "number") {
            sagiri.reply(from, `"${mtk}", bukan angka!\n[❗] Kirim perintah *!math [ Angka ]*\nContoh : !math 12*12\n*NOTE* :\n- Untuk Perkalian Menggunakan *\n- Untuk Pertambahan Menggunakan +\n- Untuk Pengurangan Mennggunakan -\n- Untuk Pembagian Menggunakan /`, id)
        } else {
            sagiri.reply(from, `*「 MATH 」*\n\n*Kalkulator*\n${mtk} = ${Math_js.evaluate(mtk)}`, id)
        }
        break

        // Group Commands (group admin only)
        case 'mute':
            sagiri.reply(from, 'FItur ini dalam perbaikan')
            /*if(!isGroupMsg) return sagiri.reply(from, 'Maaf, perintah ini hanya dapat dipakai didalam grup!')
            if (!isGroupAdmins) return sagiri.reply(from, 'Gagal, perintah ini hanya dapat digunakan oleh admin grup!', id)
            muted.push(chatId)
            fs.writeFileSync('./lib/muted.json', JSON.stringify(muted, null, 2))
            sagiri.reply(from, 'Bot telah di mute pada chat ini! #unmute untuk unmute!', id)*/
            break
        case 'unmute':
            sagiri.reply(from, 'Fitur ini dalam perbaikan')
            /*if(!isGroupMsg) return sagiri.reply(from, 'Maaf, perintah ini hanya dapat dipakai didalam grup!')
            if (!isGroupAdmins) return sagiri.reply(from, 'Gagal, perintah ini hanya dapat digunakan oleh admin grup!', id)
            let index = muted.indexOf(chatId);
            muted.splice(index,1)
            fs.writeFileSync('./lib/muted.json', JSON.stringify(muted, null, 2))
            sagiri.reply(from, 'Bot telah di unmute!', id)*/
            break
	    case 'add':
            if (!isGroupMsg) return sagiri.reply(from, 'Maaf, perintah ini hanya dapat dipakai didalam grup!', id)
            if (!isGroupAdmins) return sagiri.reply(from, 'Gagal, perintah ini hanya dapat digunakan oleh admin grup!', id)
            if (!isBotGroupAdmins) return sagiri.reply(from, 'Gagal, silahkan tambahkan bot sebagai admin grup!', id)
	        if (args.length !== 1) return sagiri.reply(from, `Untuk menggunakan ${prefix}add\nPenggunaan: ${prefix}add <nomor>\ncontoh: ${prefix}add 628xxx`, id)
                try {
                    await sagiri.addParticipant(from,`${args[0]}@c.us`)
		            .then(() => sagiri.reply(from, 'Hai selamat datang', id))
                } catch {
                    sagiri.reply(from, 'Tidak dapat menambahkan target', id)
                }
            break
        case 'kick':
            if (!isGroupMsg) return sagiri.reply(from, 'Maaf, perintah ini hanya dapat dipakai didalam grup!', id)
            if (!isGroupAdmins) return sagiri.reply(from, 'Gagal, perintah ini hanya dapat digunakan oleh admin grup!', id)
            if (!isBotGroupAdmins) return sagiri.reply(from, 'Gagal, silahkan tambahkan bot sebagai admin grup!', id)
            if (mentionedJidList.length === 0) return sagiri.reply(from, 'Maaf, format pesan salah.\nSilahkan tag satu atau lebih orang yang akan dikeluarkan', id)
            if (mentionedJidList[0] === botNumber) return await sagiri.reply(from, 'Maaf, format pesan salah.\nTidak dapat mengeluarkan akun bot sendiri', id)
            await sagiri.sendTextWithMentions(from, `Request diterima, mengeluarkan:\n${mentionedJidList.map(x => `@${x.replace('@c.us', '')}`).join('\n')}`)
            for (let i = 0; i < mentionedJidList.length; i++) {
                if (groupAdmins.includes(mentionedJidList[i])) return await sagiri.sendText(from, 'Gagal, kamu tidak bisa mengeluarkan admin grup.')
                await sagiri.removeParticipant(groupId, mentionedJidList[i])
            }
            break
        case 'promote':
            if (!isGroupMsg) return sagiri.reply(from, 'Maaf, perintah ini hanya dapat dipakai didalam grup!', id)
            if (!isGroupAdmins) return sagiri.reply(from, 'Gagal, perintah ini hanya dapat digunakan oleh admin grup!', id)
            if (!isBotGroupAdmins) return sagiri.reply(from, 'Gagal, silahkan tambahkan bot sebagai admin grup!', id)
            if (mentionedJidList.length !== 1) return sagiri.reply(from, 'Maaf, hanya bisa mempromote 1 user', id)
            if (groupAdmins.includes(mentionedJidList[0])) return await sagiri.reply(from, 'Maaf, user tersebut sudah menjadi admin.', id)
            if (mentionedJidList[0] === botNumber) return await sagiri.reply(from, 'Maaf, format pesan salah.\nTidak dapat mempromote akun bot sendiri', id)
            await sagiri.promoteParticipant(groupId, mentionedJidList[0])
            await sagiri.sendTextWithMentions(from, `Request diterima, menambahkan @${mentionedJidList[0].replace('@c.us', '')} sebagai admin.`)
            break
        case 'demote':
            if (!isGroupMsg) return sagiri.reply(from, 'Maaf, perintah ini hanya dapat dipakai didalam grup!', id)
            if (!isGroupAdmins) return sagiri.reply(from, 'Gagal, perintah ini hanya dapat digunakan oleh admin grup!', id)
            if (!isBotGroupAdmins) return sagiri.reply(from, 'Gagal, silahkan tambahkan bot sebagai admin grup!', id)
            if (mentionedJidList.length !== 1) return sagiri.reply(from, 'Maaf, hanya bisa mendemote 1 user', id)
            if (!groupAdmins.includes(mentionedJidList[0])) return await sagiri.reply(from, 'Maaf, user tersebut belum menjadi admin.', id)
            if (mentionedJidList[0] === botNumber) return await sagiri.reply(from, 'Maaf, format pesan salah.\nTidak dapat mendemote akun bot sendiri', id)
            await sagiri.demoteParticipant(groupId, mentionedJidList[0])
            await sagiri.sendTextWithMentions(from, `Request diterima, menghapus jabatan @${mentionedJidList[0].replace('@c.us', '')}.`)
            break
        case 'bye':
            if (!isGroupMsg) return sagiri.reply(from, 'Maaf, perintah ini hanya dapat dipakai didalam grup!', id)
            if (!isGroupAdmins) return sagiri.reply(from, 'Gagal, perintah ini hanya dapat digunakan oleh admin grup!', id)
            sagiri.sendText(from, 'Good bye... ( ⇀‸↼‶ )').then(() => sagiri.leaveGroup(groupId))
            break
        case 'del':
        case 'delete':
            if (!isGroupAdmins) return sagiri.reply(from, 'Gagal, perintah ini hanya dapat digunakan oleh admin grup!', id)
            if (!quotedMsg) return sagiri.reply(from, `Maaf, format pesan salah silahkan.\nReply pesan bot dengan caption ${prefix}del`, id)
            if (!quotedMsgObj.fromMe) return sagiri.reply(from, `Maaf, format pesan salah silahkan.\nReply pesan bot dengan caption ${prefix}delete`, id)
            sagiri.deleteMessage(quotedMsgObj.chatId, quotedMsgObj.id, false)
            break
        case 'tagall':
        case 'everyone':
            if (!isGroupMsg) return sagiri.reply(from, 'Maaf, perintah ini hanya dapat dipakai didalam grup!', id)
            if (!isGroupAdmins) return sagiri.reply(from, 'Gagal, perintah ini hanya dapat digunakan oleh admin grup!', id)
            const groupMem = await sagiri.getGroupMembers(groupId)
            let hehex = '╔══✪〘 Mention All 〙✪══\n'
            for (let i = 0; i < groupMem.length; i++) {
                hehex += '╠➥'
                hehex += ` @${groupMem[i].id.replace(/@c.us/g, '')}\n`
            }
            hehex += '╚═〘 *Sagiri* 〙'
            await sagiri.sendTextWithMentions(from, hehex)
            break
		case 'simisimi':
			if (!isGroupMsg) return sagiri.reply(from, 'Maaf, perintah ini hanya dapat dipakai didalam grup!', id)
			sagiri.reply(from, `Untuk mengaktifkan simi-simi pada Group Chat\n\nPenggunaan\n${prefix}simi on --mengaktifkan\n${prefix}simi off --nonaktifkan\n`, id)
			break
		case 'simi':
            //if (!isOwnerBot) return sagiri.reply(from, 'Fitur ini berbayar')
			if (!isGroupMsg) return sagiri.reply(from, 'Maaf, perintah ini hanya dapat dipakai didalam grup!', id)
            if (!isGroupAdmins) return sagiri.reply(from, 'Gagal, perintah ini hanya dapat digunakan oleh admin grup!', id)
			if (args.length !== 1) return sagiri.reply(from, `Untuk mengaktifkan simi-simi pada Group Chat\n\nPenggunaan\n${prefix}simi on --mengaktifkan\n${prefix}simi off --nonaktifkan\n`, id)
			if (args[0] == 'on') {
				simi.push(chatId)
				fs.writeFileSync('./settings/simi.json', JSON.stringify(simi))
                sagiri.reply(from, 'Mengaktifkan bot simi-simi!\nKetik !ai [teks]\nContoh: !ai halo', id)
			} else if (args[0] == 'off') {
				let inxx = simi.indexOf(chatId)
				simi.splice(inxx, 1)
				fs.writeFileSync('./settings/simi.json', JSON.stringify(simi))
				sagiri.reply(from, 'Menonaktifkan bot simi-simi!', id)
			} else {
				sagiri.reply(from, `Untuk mengaktifkan simi-simi pada Group Chat\n\nPenggunaan\n${prefix}simi on --mengaktifkan\n${prefix}simi off --nonaktifkan\n`, id)
			}
			break
		case 'katakasar':
			if (!isGroupMsg) return sagiri.reply(from, 'Maaf, perintah ini hanya dapat dipakai didalam grup!', id)
			sagiri.reply(from, `Untuk mengaktifkan Fitur Kata Kasar pada Group Chat\n\napa itu? fitur apabila seseorang mengucapkan kata kasar akan mendapatkan denda\n\nPenggunaan\n${prefix}kasar on --mengaktifkan\n${prefix}kasar off --nonaktifkan\n\n${prefix}reset --reset jumlah denda`, id)
			break
		case 'kasar':
			if (!isGroupMsg) return sagiri.reply(from, 'Maaf, perintah ini hanya dapat dipakai didalam grup!', id)
            //if (!isGroupAdmins) return sagiri.reply(from, 'Gagal, perintah ini hanya dapat digunakan oleh admin grup!', id)
            if (args.length !== 1) return sagiri.reply(from, `Untuk mengaktifkan Fitur Kata Kasar pada Group Chat\n\napasih itu? fitur apabila seseorang mengucapkan kata kasar akan mendapatkan denda\n\nPenggunaan\n${prefix}kasar on --mengaktifkan\n${prefix}kasar off --nonaktifkan\n\n${prefix}reset --reset jumlah denda`, id)
            if (!isOwnerBot) return sagiri.reply(from, `Command ini dinonaktifkan\nNyepam mulu sih\nOniichan jadi marah kan`)
            if (args[0] == 'on') {
				ngegas.push(chatId)
				fs.writeFileSync('./settings/ngegas.json', JSON.stringify(ngegas))
				sagiri.reply(from, 'sukses mengaktifkan fitur anti kata kasar', id)
			} else if (args[0] == 'off') {
				let nixx = ngegas.indexOf(chatId)
				ngegas.splice(nixx, 1)
				fs.writeFileSync('./settings/ngegas.json', JSON.stringify(ngegas))
				sagiri.reply(from, 'sukses menonatifkan fitur anti kata kasar', id)
			} else {
				sagiri.reply(from, `Untuk mengaktifkan Fitur Kata Kasar pada Group Chat\n\napasih itu? fitur apabila seseorang mengucapkan kata kasar akan mendapatkan denda\n\nPenggunaan\n${prefix}kasar on --mengaktifkan\n${prefix}kasar off --nonaktifkan\n\n${prefix}reset --reset jumlah denda`, id)
			}
			break
		case 'reset':
			if (!isGroupMsg) return sagiri.reply(from, 'Maaf, perintah ini hanya dapat dipakai didalam grup!', id)
            if (!isGroupAdmins) return sagiri.reply(from, 'Gagal, perintah ini hanya dapat digunakan oleh admin grup!', id)
			const reset = db.get('group').find({ id: groupId }).assign({ members: []}).write()
            if(reset){
				await sagiri.sendText(from, "Klasemen telah direset.")
            }
			break
			
        //Owner Group
        case 'kickall': //mengeluarkan semua member
        if (!isGroupMsg) return sagiri.reply(from, 'Maaf, perintah ini hanya dapat dipakai didalam grup!', id)
        let isOwner = chat.groupMetadata.owner == pengirim
        if (!isOwner) return sagiri.reply(from, 'Maaf, perintah ini hanya dapat dipakai oleh owner grup!', id)
        if (!isBotGroupAdmins) return sagiri.reply(from, 'Gagal, silahkan tambahkan bot sebagai admin grup!', id)
            const allMem = await sagiri.getGroupMembers(groupId)
            for (let i = 0; i < allMem.length; i++) {
                if (groupAdmins.includes(allMem[i].id)) {

                } else {
                    await sagiri.removeParticipant(groupId, allMem[i].id)
                }
            }
            sagiri.reply(from, 'Success kick all member', id)
        break

        //Owner Bot
        case 'ban':
            if (!isOwnerBot) return sagiri.reply(from, 'Perintah ini hanya untuk oniichan!', id)
            if (args.length == 0) return sagiri.reply(from, `Untuk banned seseorang agar tidak bisa menggunakan commands\n\nCaranya ketik: \n${prefix}ban add 628xx --untuk mengaktifkan\n${prefix}ban del 628xx --untuk nonaktifkan\n\ncara cepat ban banyak digrup ketik:\n${prefix}ban @tag @tag @tag`, id)
            if (args[0] == 'add') {
                banned.push(args[1]+'@c.us')
                fs.writeFileSync('./settings/banned.json', JSON.stringify(banned))
                sagiri.reply(from, 'Success banned target!')
            } else
            if (args[0] == 'del') {
                let xnxx = banned.indexOf(args[1]+'@c.us')
                banned.splice(xnxx,1)
                fs.writeFileSync('./settings/banned.json', JSON.stringify(banned))
                sagiri.reply(from, 'Success unbanned target!')
            } else {
             for (let i = 0; i < mentionedJidList.length; i++) {
                banned.push(mentionedJidList[i])
                fs.writeFileSync('./settings/banned.json', JSON.stringify(banned))
                sagiri.reply(from, 'Success ban target!', id)
                }
            }
            break
        case 'listbanned':
        case 'listban':
            let bened = `Nih orang yang kena banned\nTotal : ${banned.length}\n`
            for (let i of banned) {
                bened += `─➤ ${i.replace(/@c.us/g,'')}\n`
            }
            await sagiri.reply(from, bened, id)
            break
        case 'listblok':
        case 'listblock':
            let hilih = `Nih orang yang kena blok\nTotal : ${blockNumber.length}\n`
            for (let i of blockNumber) {
                hilih += `─➤ ${i.replace(/@c.us/g,'')}\n`
            }
            await sagiri.reply(from, hilih, id)
            break
        case 'listgroup':
        case 'listgrop':
        case 'listgrup':
            sagiri.getAllGroups().then((res) => {
                let berhitung1 = 1
                let gc = `*This is list of group* :\n`
                for (let i = 0; i < res.length; i++) {
                    gc += `\n─────────────────\n\n*No : ${i+1}*\n*Nama* : ${res[i].name}\n*Pesan Belum Dibaca* : ${res[i].unreadCount} chat\n`
                }
                sagiri.reply(from, gc, id)
            })
            break
        case 'ownsave':
            if(!isOwnerBot) return sagiri.reply(from, 'You Not My Oniichan, Ba-Baka!!', id)
            const ownsavetxt = JSON.parse(fs.readFileSync('./owner/owner.json'))
                ownsavetxt.push(args)
                fs.writeFileSync('./owner/owner.json', JSON.stringify(ownsavetxt))
                sagiri.reply(from, `はい Oniichan`, id)
            break
        case 'bc': //untuk broadcast atau promosi
            if (!isOwnerBot) return sagiri.reply(from, 'Perintah ini hanya untuk oniichan!', id)
            if (args.length == 0) return sagiri.reply(from, `Untuk broadcast ke semua chat ketik:\n${prefix}bc [isi chat]`)
            let msg = body.slice(4)
            const chatz = await sagiri.getAllChatIds()
            for (let idk of chatz) {
                var cvk = await sagiri.getChatById(idk)
                if (!cvk.isReadOnly) sagiri.sendText(idk, `〘 *Sagiri* 〙\n\n${msg}`)
                if (cvk.isReadOnly) sagiri.sendText(idk, `〘 *Sagiri* 〙\n\n${msg}`)
            }
            sagiri.reply(from, 'Broadcast Success!', id)
            break
        case 'leaveall': //mengeluarkan bot dari semua group serta menghapus chatnya
            if (!isOwnerBot) return sagiri.reply(from, 'Perintah ini hanya untuk oniichan', id)
            const allChatz = await sagiri.getAllChatIds()
            const allGroupz = await sagiri.getAllGroups()
            for (let gclist of allGroupz) {
                await sagiri.sendText(gclist.contact.id, `Maaf bot sedang pembersihan, total chat aktif : ${allChatz.length}`)
                await sagiri.leaveGroup(gclist.contact.id)
                await sagiri.deleteChat(gclist.contact.id)
            }
            sagiri.reply(from, 'Success leave all group!', id)
            break
        case 'clearall': //menghapus seluruh pesan diakun bot
            if (!isOwnerBot) return sagiri.reply(from, 'Perintah ini hanya untuk oniichan', id)
            const allChatx = await sagiri.getAllChats()
            for (let dchat of allChatx) {
                await sagiri.deleteChat(dchat.id)
            }
            sagiri.reply(from, 'Success clear all chat!', id)
            break
        
        //Client CMD
        case 'client':
            function sleep(ms) {
                return new Promise(resolve => setTimeout(resolve, ms));
              }
            if (!isOwnerBot) return sagiri.reply(from, 'Perintah ini hanya untuk oniichan', id)
            if (args.length == 0) return sagiri.reply(from, 'Ketik !client menu')
            if (args[0] == 'menu') {
                sagiri.reply(from, `
⚠ [ *Admin Bot Only* ] ⚠
Berikut adalah fitur admin yang ada pada bot ini!

─➤ *!client kill* - Menonaktifkan bot
─➤ *!client restart* - Restart bot

Gunakan sebaik-baiknya`)
            } else
            if (args[0] == 'kill') {
                sagiri.reply(from, 'Killed')
                await sleep(5000)
                sagiri.kill()
            } else
            if (args[0] == 'restart') {
                sagiri.sendText(from, '*[WARN]* Restarting ...')
                setting.restartState = true
                setting.restartId = chatId
                var obj = []
                //fs.writeFileSync('./lib/setting.json', JSON.stringify(obj, null,2));
                //fs.writeFileSync('./lib/limit.json', JSON.stringify(obj));
                //fs.writeFileSync('./lib/muted.json', JSON.stringify(obj));
                //fs.writeFileSync('./lib/msgLimit.json', JSON.stringify(obj));
                fs.writeFileSync('./settings/banned.json', JSON.stringify(obj));
                //fs.writeFileSync('./lib/welcome.json', JSON.stringify(obj));
                //fs.writeFileSync('./lib/left.json', JSON.stringify(obj));
                fs.writeFileSync('./settings/simi.json', JSON.stringify(obj));
                //fs.writeFileSync('./lib/nsfwz.json', JSON.stringify(obj));
                const spawn = require('child_process').exec;
                function os_func() {
                    this.execCommand = function (command) {
                        return new Promise((resolve, reject)=> {
                        spawn(command, (error, stdout, stderr) => {
                            if (error) {
                                reject(error);
                                return;
                            }
                            resolve(stdout)
                        });
                    })
                }}
                var oz = new os_func();
                oz.execCommand('npm restart index').then(res=> {
                }).catch(err=> {
                    console.log("os >>>", err);
                })
            }
            break
        case 'report':
            const time = moment(t * 1000).format('DD/MM HH:mm:ss')
            if (args[0] == 'bug') {
            if (args.length === 0) return sagiri.reply(from, '[❗] Kirim perintah *!report bug [teks]*\ncontoh : *!report bug Permisi Owner, Ada bug pada command !nhder, Tolong diperbaiki*')
            const bug = body.slice(11)
            if(!bug) return
            if(isGroupMsg){
                sagiri.sendText('6281358181668@c.us', `*[BUG REPORT]*\n*WAKTU* : ${time}\nNO PENGIRIM : wa.me/${sender.id.match(/\d+/g)}\nGroup: ${formattedTitle}\n\n${bug}`)
                sagiri.reply(from, 'Masalah telah di laporkan ke oniichan, laporan palsu/main2 tidak akan ditanggapi.' ,id)
            }else{
                sagiri.sendText('6281358181668@c.us', `*[BUG REPORT]*\n*WAKTU* : ${time}\nNO PENGIRIM : wa.me/${sender.id.match(/\d+/g)}\n\n${bug}`)
                sagiri.reply(from, 'Masalah telah di laporkan ke oniichan, laporan palsu/main2 tidak akan ditanggapi.', id)
            }
            break
            }else{
                sagiri.reply(from, '[❗] Kirim perintah *!report bug [teks]*\ncontoh : *!report bug Permisi Owner, Ada bug pada command !nhder, Tolong diperbaiki*')
            }
        //simi
        default:
            //if(!isCmd) return await XpAdd(from)
            await sagiri.sendSeen(from)  
        }
        // Simi-simi function
		if ((!isCmd && isGroupMsg && isSimi) && message.type === 'chat') {
			axios.get(`https://arugaz.herokuapp.com/api/simisimi?kata=${encodeURIComponent(message.body)}&apikey=${apiSimi}`)
			.then((res) => {
				if (res.data.status == 403) return sagiri.sendText(ownerNumber, `${res.data.result}\n\n${res.data.pesan}`)
				sagiri.reply(from, `${res.data.result}`, id)
			})
			.catch((err) => {
				sagiri.reply(from, `${err}`, id)
            })
        }
		
		// Kata kasar function
		if(!isCmd && isGroupMsg && isNgegas) {
            const find = db.get('group').find({ id: groupId }).value()
            if(find && find.id === groupId){
                const cekuser = db.get('group').filter({id: groupId}).map('members').value()[0]
                const isIn = inArray(pengirim, cekuser)
                if(cekuser && isIn !== false){
                    if(isKasar){
                        const denda = db.get('group').filter({id: groupId}).map('members['+isIn+']').find({ id: pengirim }).update('denda', n => n + 5000).write()
                        if(denda){
                            await sagiri.reply(from, "Jangan badword baka\nDenda +5.000\nTotal : Rp"+formatin(denda.denda), id)
                        }
                    }
                } else {
                    const cekMember = db.get('group').filter({id: groupId}).map('members').value()[0]
                    if(cekMember.length === 0){
                        if(isKasar){
                            db.get('group').find({ id: groupId }).set('members', [{id: pengirim, denda: 5000}]).write()
                        } else {
                            db.get('group').find({ id: groupId }).set('members', [{id: pengirim, denda: 0}]).write()
                        }
                    } else {
                        const cekuser = db.get('group').filter({id: groupId}).map('members').value()[0]
                        if(isKasar){
                            cekuser.push({id: pengirim, denda: 5000})
                            await sagiri.reply(from, "Jangan badword baka\nDenda +5.000", id)
                        } else {
                            cekuser.push({id: pengirim, denda: 0})
                        }
                        db.get('group').find({ id: groupId }).set('members', cekuser).write()
                    }
                }
            } else {
                if(isKasar){
                    db.get('group').push({ id: groupId, members: [{id: pengirim, denda: 5000}] }).write()
                    await sagiri.reply(from, "Jangan badword baka\nDenda +5.000\nTotal : Rp5.000", id)
                } else {
                    db.get('group').push({ id: groupId, members: [{id: pengirim, denda: 0}] }).write()
                }
            }
        }
    } catch (err) {
        console.log(color('[EROR]', 'red'), err)
    }
}
