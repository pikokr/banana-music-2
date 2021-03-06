import { User } from 'discord.js'
import { MessageEmbed } from 'discord.js'
import { MessageReaction } from 'discord.js'
import { Command } from '../../utils/typings'

export default {
  name: 'play',
  aliases: ['재생'],
  category: 'music',
  execute: async (msg, client, args) => {
    const query = args.join(' ')
    if (!msg.member?.voice.channelID)
      return msg.reply('음성 채널에 들어가주세요')
    const player =
      client.music.players.get(msg.guild!.id) ??
      client.music.create({
        selfDeafen: true,
        guild: msg.guild!.id,
        textChannel: msg.channel.id,
        voiceChannel: msg.member.voice.channelID,
      })
    if (player.voiceChannel !== msg.member.voice.channelID)
      return msg.reply('음악을 재생중인 음성채널에 들어가주세요!')
    if (!query) return msg.reply(`${client.config.prefix}재생 <곡 제목>`)
    const res = await client.music.search(query, msg.author)
    if (res.loadType === 'NO_MATCHES') {
      return msg.reply('검색 결과가 없습니다')
    } else if (res.loadType === 'LOAD_FAILED') {
      return msg.reply(`불러오기 실패: ${res.exception?.message}`)
    } else if (res.loadType === 'PLAYLIST_LOADED') {
      player.queue.add(res.tracks)
      player.connect()
      if (!player.playing) player.play()
      return msg.reply(`${res.tracks.length}곡을 대기열에 추가했어요!`)
    } else if (res.loadType) {
      const tracks = res.tracks.slice(0, 5)
      const embed = new MessageEmbed()
        .setTitle(`곡을 선택해주세요(1-${tracks.length})`)
        .setDescription(tracks.map((track, i) => `${i + 1} - ${track.title}`))
      const m = await msg.reply(embed)
      const emojis = ['1⃣', '2⃣', '3⃣', '4⃣', '5⃣', '🚫']
      await Promise.all(emojis.map((r) => m.react(r)))
      const num = Array.from(emojis)
      num.pop()
      const result = await m.awaitReactions(
        (reaction: MessageReaction, user: User) =>
          user.id === msg.author.id && emojis.includes(reaction.emoji.name),
        {
          max: 1,
          maxEmojis: 1,
          time: 30000,
        },
      )
      if (!result.first() || result.first()?.emoji.name === emojis.pop())
        return m.edit('취소되었습니다.', { embed: null })
      const idx = num.indexOf(result.first()!.emoji.name)
      player.queue.add(tracks[idx])
      await m.delete()
      await msg.reply(`곡 \`${tracks[idx].title}\`을(를) 재생할게요!`)
      player.connect()
      if (!player.playing) player.play()
    }
  },
} as Command
