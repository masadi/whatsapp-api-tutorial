const { Client, MessageMedia, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const { body, validationResult } = require('express-validator');
const socketIO = require('socket.io');
const qrcode = require('qrcode');
const http = require('http');
const fs = require('fs');
const { phoneNumberFormatter } = require('./helpers/formatter');
const fileUpload = require('express-fileupload');
const axios = require('axios');
const mime = require('mime-types');

const port = process.env.PORT || 4000;

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.json());
app.use(express.urlencoded({
  extended: true
}));

/**
 * BASED ON MANY QUESTIONS
 * Actually ready mentioned on the tutorials
 * 
 * Many people confused about the warning for file-upload
 * So, we just disabling the debug for simplicity.
 */
app.use(fileUpload({
  debug: false
}));

app.get('/', (req, res) => {
  res.sendFile('index.html', {
    root: __dirname
  });
});

const client = new Client({
  restartOnAuthFail: true,
  puppeteer: {
    headless: true,
    args: [
      '--use-gl=egl',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process', // <- this one doesn't works in Windows
      '--disable-gpu'
    ],
  },
  authStrategy: new LocalAuth()
});

/*
client.on('message', msg => {
  if (msg.body == '!ping') {
    msg.reply('pong');
  } else if (msg.body == 'good morning') {
    msg.reply('selamat pagi');
  } else if (msg.body == '!groups') {
    client.getChats().then(chats => {
      const groups = chats.filter(chat => chat.isGroup);

      if (groups.length == 0) {
        msg.reply('You have no group yet.');
      } else {
        let replyMsg = '*YOUR GROUPS*\n\n';
        groups.forEach((group, i) => {
          replyMsg += `ID: ${group.id._serialized}\nName: ${group.name}\n\n`;
        });
        replyMsg += '_You can use the group id to send a message to the group._'
        msg.reply(replyMsg);
      }
    });
  }
  */
client.on('message', async msg => {
  if (msg.body === '!ping reply') {
    // Send a new message as a reply to the current one
    msg.reply('pong');

  } else if (msg.body === '!ping') {
      // Send a new message to the same chat
      chat.sendStateTyping();
      client.sendMessage(msg.from, 'pong');

  } else if (msg.body.startsWith('!sendto ')) {
      // Direct send a new message to specific id
      let number = msg.body.split(' ')[1];
      let messageIndex = msg.body.indexOf(number) + number.length;
      let message = msg.body.slice(messageIndex, msg.body.length);
      number = number.includes('@c.us') ? number : `${number}@c.us`;
      let chat = await msg.getChat();
      chat.sendSeen();
      client.sendMessage(number, message);

  } else if (msg.body.startsWith('!subject ')) {
      // Change the group subject
      let chat = await msg.getChat();
      if (chat.isGroup) {
          let newSubject = msg.body.slice(9);
          chat.setSubject(newSubject);
      } else {
          msg.reply('This command can only be used in a group!');
      }
  } else if (msg.body.startsWith('!echo ')) {
      // Replies with the same message
      msg.reply(msg.body.slice(6));
  } else if (msg.body.startsWith('!desc ')) {
      // Change the group description
      let chat = await msg.getChat();
      if (chat.isGroup) {
          let newDescription = msg.body.slice(6);
          chat.setDescription(newDescription);
      } else {
          msg.reply('This command can only be used in a group!');
      }
  } else if (msg.body === '!leave') {
      // Leave the group
      let chat = await msg.getChat();
      if (chat.isGroup) {
          chat.leave();
      } else {
          msg.reply('This command can only be used in a group!');
      }
  } else if (msg.body.startsWith('!join ')) {
      const inviteCode = msg.body.split(' ')[1];
      try {
          await client.acceptInvite(inviteCode);
          msg.reply('Joined the group!');
      } catch (e) {
          msg.reply('That invite code seems to be invalid.');
      }
  } else if (msg.body === '!groupinfo') {
      let chat = await msg.getChat();
      if (chat.isGroup) {
          msg.reply(`
              *Group Details*
              Name: ${chat.name}
              Description: ${chat.description}
              Created At: ${chat.createdAt.toString()}
              Created By: ${chat.owner.user}
              Participant count: ${chat.participants.length}
          `);
      } else {
          msg.reply('This command can only be used in a group!');
      }
  } else if (msg.body === '!chats') {
      const chats = await client.getChats();
      client.sendMessage(msg.from, `The bot has ${chats.length} chats open.`);
  } else if (msg.body === '!info') {
      let info = client.info;
      client.sendMessage(msg.from, `
          *Connection info*
          User name: ${info.pushname}
          My number: ${info.wid.user}
          Platform: ${info.platform}
      `);
  } else if (msg.body === '!mediainfo' && msg.hasMedia) {
      const attachmentData = await msg.downloadMedia();
      msg.reply(`
          *Media info*
          MimeType: ${attachmentData.mimetype}
          Filename: ${attachmentData.filename}
          Data (length): ${attachmentData.data.length}
      `);
  } else if (msg.body === '!quoteinfo' && msg.hasQuotedMsg) {
      const quotedMsg = await msg.getQuotedMessage();

      quotedMsg.reply(`
          ID: ${quotedMsg.id._serialized}
          Type: ${quotedMsg.type}
          Author: ${quotedMsg.author || quotedMsg.from}
          Timestamp: ${quotedMsg.timestamp}
          Has Media? ${quotedMsg.hasMedia}
      `);
  } else if (msg.body === '!resendmedia' && msg.hasQuotedMsg) {
      const quotedMsg = await msg.getQuotedMessage();
      if (quotedMsg.hasMedia) {
          const attachmentData = await quotedMsg.downloadMedia();
          client.sendMessage(msg.from, attachmentData, { caption: 'Here\'s your requested media.' });
      }
  } else if (msg.body === '!location') {
      msg.reply(new Location(37.422, -122.084, 'Googleplex\nGoogle Headquarters'));
  } else if (msg.location) {
      msg.reply(msg.location);
  } else if (msg.body.startsWith('!status ')) {
      const newStatus = msg.body.split(' ')[1];
      await client.setStatus(newStatus);
      msg.reply(`Status was updated to *${newStatus}*`);
  } else if (msg.body === '!mention') {
      const contact = await msg.getContact();
      const chat = await msg.getChat();
      chat.sendMessage(`Hi @${contact.number}!`, {
          mentions: [contact]
      });
  } else if (msg.body === '!delete') {
      if (msg.hasQuotedMsg) {
          const quotedMsg = await msg.getQuotedMessage();
          if (quotedMsg.fromMe) {
              quotedMsg.delete(true);
          } else {
              msg.reply('I can only delete my own messages');
          }
      }
  } else if (msg.body === '!pin') {
      const chat = await msg.getChat();
      await chat.pin();
  } else if (msg.body === '!archive') {
      const chat = await msg.getChat();
      await chat.archive();
  } else if (msg.body === '!mute') {
      const chat = await msg.getChat();
      // mute the chat for 20 seconds
      const unmuteDate = new Date();
      unmuteDate.setSeconds(unmuteDate.getSeconds() + 20);
      await chat.mute(unmuteDate);
  } else if (msg.body === '!typing') {
      const chat = await msg.getChat();
      // simulates typing in the chat
      chat.sendStateTyping();
  } else if (msg.body === '!recording') {
      const chat = await msg.getChat();
      // simulates recording audio in the chat
      chat.sendStateRecording();
  } else if (msg.body === '!clearstate') {
      const chat = await msg.getChat();
      // stops typing or recording in the chat
      chat.clearState();
  } else if (msg.body === '!jumpto') {
      if (msg.hasQuotedMsg) {
          const quotedMsg = await msg.getQuotedMessage();
          client.interface.openChatWindowAt(quotedMsg.id._serialized);
      }
  } else if (msg.body === '!buttons') {
      let button = new Buttons('Button body', [{ body: 'bt1' }, { body: 'bt2' }, { body: 'bt3' }], 'title', 'footer');
      client.sendMessage(msg.from, button);
  } else if (msg.body === '!list') {
      let sections = [{ title: 'sectionTitle', rows: [{ title: 'ListItem1', description: 'desc' }, { title: 'ListItem2' }] }];
      let list = new List('List body', 'btnText', sections, 'Title', 'footer');
      client.sendMessage(msg.from, list);
  } else if (msg.body === '!reaction') {
      msg.react('👍');
  }
  // NOTE!
  // UNCOMMENT THE SCRIPT BELOW IF YOU WANT TO SAVE THE MESSAGE MEDIA FILES
  // Downloading media
  // if (msg.hasMedia) {
  //   msg.downloadMedia().then(media => {
  //     // To better understanding
  //     // Please look at the console what data we get
  //     console.log(media);

  //     if (media) {
  //       // The folder to store: change as you want!
  //       // Create if not exists
  //       const mediaPath = './downloaded-media/';

  //       if (!fs.existsSync(mediaPath)) {
  //         fs.mkdirSync(mediaPath);
  //       }

  //       // Get the file extension by mime-type
  //       const extension = mime.extension(media.mimetype);
        
  //       // Filename: change as you want! 
  //       // I will use the time for this example
  //       // Why not use media.filename? Because the value is not certain exists
  //       const filename = new Date().getTime();

  //       const fullFilename = mediaPath + filename + '.' + extension;

  //       // Save to file
  //       try {
  //         fs.writeFileSync(fullFilename, media.data, { encoding: 'base64' }); 
  //         console.log('File downloaded successfully!', fullFilename);
  //       } catch (err) {
  //         console.log('Failed to save the file:', err);
  //       }
  //     }
  //   });
  // }
});

client.initialize();

// Socket IO
io.on('connection', function(socket) {
  socket.emit('message', 'Connecting...');

  client.on('qr', (qr) => {
    console.log('QR RECEIVED', qr);
    qrcode.toDataURL(qr, (err, url) => {
      socket.emit('qr', url);
      socket.emit('message', 'QR Code received, scan please!');
    });
  });

  client.on('ready', () => {
    socket.emit('ready', 'Whatsapp is ready!');
    socket.emit('message', 'Whatsapp is ready!');
  });

  client.on('authenticated', () => {
    socket.emit('authenticated', 'Whatsapp is authenticated!');
    socket.emit('message', 'Whatsapp is authenticated!');
    console.log('AUTHENTICATED');
  });

  client.on('auth_failure', function(session) {
    socket.emit('message', 'Auth failure, restarting...');
  });

  client.on('disconnected', (reason) => {
    socket.emit('message', 'Whatsapp is disconnected!');
    client.destroy();
    client.initialize();
  });
});


const checkRegisteredNumber = async function(number) {
  const isRegistered = await client.isRegisteredUser(number);
  return isRegistered;
}

// Send message
app.post('/send-message', [
  body('number').notEmpty(),
  body('message').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req).formatWith(({
    msg
  }) => {
    return msg;
  });

  if (!errors.isEmpty()) {
    return res.status(422).json({
      status: false,
      message: errors.mapped()
    });
  }

  const number = phoneNumberFormatter(req.body.number);
  const message = req.body.message;

  const isRegisteredNumber = await checkRegisteredNumber(number);

  if (!isRegisteredNumber) {
    return res.status(422).json({
      status: false,
      message: 'The number is not registered'
    });
  }

  client.sendMessage(number, message).then(response => {
    res.status(200).json({
      status: true,
      response: response
    });
  }).catch(err => {
    res.status(500).json({
      status: false,
      response: err
    });
  });
});

// Send media
app.post('/send-media', async (req, res) => {
  const number = phoneNumberFormatter(req.body.number);
  const caption = req.body.caption;
  const fileUrl = req.body.file;

  // const media = MessageMedia.fromFilePath('./image-example.png');
  // const file = req.files.file;
  // const media = new MessageMedia(file.mimetype, file.data.toString('base64'), file.name);
  let mimetype;
  const attachment = await axios.get(fileUrl, {
    responseType: 'arraybuffer'
  }).then(response => {
    mimetype = response.headers['content-type'];
    return response.data.toString('base64');
  });

  const media = new MessageMedia(mimetype, attachment, 'Media');

  client.sendMessage(number, media, {
    caption: caption
  }).then(response => {
    res.status(200).json({
      status: true,
      response: response
    });
  }).catch(err => {
    res.status(500).json({
      status: false,
      response: err
    });
  });
});

const findGroupByName = async function(name) {
  const group = await client.getChats().then(chats => {
    return chats.find(chat => 
      chat.isGroup && chat.name.toLowerCase() == name.toLowerCase()
    );
  });
  return group;
}

// Send message to group
// You can use chatID or group name, yea!
app.post('/send-group-message', [
  body('id').custom((value, { req }) => {
    if (!value && !req.body.name) {
      throw new Error('Invalid value, you can use `id` or `name`');
    }
    return true;
  }),
  body('message').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req).formatWith(({
    msg
  }) => {
    return msg;
  });

  if (!errors.isEmpty()) {
    return res.status(422).json({
      status: false,
      message: errors.mapped()
    });
  }

  let chatId = req.body.id;
  const groupName = req.body.name;
  const message = req.body.message;

  // Find the group by name
  if (!chatId) {
    const group = await findGroupByName(groupName);
    if (!group) {
      return res.status(422).json({
        status: false,
        message: 'No group found with name: ' + groupName
      });
    }
    chatId = group.id._serialized;
  }

  client.sendMessage(chatId, message).then(response => {
    res.status(200).json({
      status: true,
      response: response
    });
  }).catch(err => {
    res.status(500).json({
      status: false,
      response: err
    });
  });
});

// Clearing message on spesific chat
app.post('/clear-message', [
  body('number').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req).formatWith(({
    msg
  }) => {
    return msg;
  });

  if (!errors.isEmpty()) {
    return res.status(422).json({
      status: false,
      message: errors.mapped()
    });
  }

  const number = phoneNumberFormatter(req.body.number);

  const isRegisteredNumber = await checkRegisteredNumber(number);

  if (!isRegisteredNumber) {
    return res.status(422).json({
      status: false,
      message: 'The number is not registered'
    });
  }

  const chat = await client.getChatById(number);
  
  chat.clearMessages().then(status => {
    res.status(200).json({
      status: true,
      response: status
    });
  }).catch(err => {
    res.status(500).json({
      status: false,
      response: err
    });
  })
});

server.listen(port, function() {
  console.log('App running on *: ' + port);
});
