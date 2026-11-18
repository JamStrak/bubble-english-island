export const guides = {
  listen: './voice/guide-listen.mp3',
  choose: './voice/guide-choose.mp3',
  speak: './voice/guide-speak.mp3',
};

export const islands = [
  {
    id: 'snacks',
    title: '点心小屋',
    english: 'Snack Hut',
    emoji: '🧺',
    lessons: [
      {
        id: 'apples',
        english: 'I like apples.',
        chinese: '我喜欢苹果。',
        audio: './voice/meals-05.mp3',
        picture: './pictures/apples.webp',
        emoji: '🍎',
      },
      {
        id: 'water',
        english: 'I need water.',
        chinese: '我想喝水。',
        audio: './voice/needs-01.mp3',
        picture: './pictures/water.webp',
        emoji: '💧',
      },
      {
        id: 'milk',
        english: 'May I have some milk?',
        chinese: '可以给我一点牛奶吗？',
        audio: './voice/meals-10.mp3',
        picture: './pictures/milk.webp',
        emoji: '🥛',
      },
      {
        id: 'eat',
        english: "Let's eat.",
        chinese: '我们开饭吧。',
        audio: './voice/meals-01.mp3',
        picture: './pictures/eat.webp',
        emoji: '🍽️',
      },
    ],
  },
  {
    id: 'animals',
    title: '动物观察站',
    english: 'Animal Lookout',
    emoji: '🐾',
    lessons: [
      {
        id: 'cat',
        english: "It's a cat.",
        chinese: '是一只小猫。',
        audio: './voice/explore-02.mp3',
        picture: './pictures/cat.webp',
        emoji: '🐈',
      },
      {
        id: 'bird',
        english: 'Look at the bird.',
        chinese: '看那只小鸟。',
        audio: './voice/explore-03.mp3',
        picture: './pictures/bird.webp',
        emoji: '🐦',
      },
      {
        id: 'dog',
        english: 'I hear a dog.',
        chinese: '我听到小狗叫了。',
        audio: './voice/explore-10.mp3',
        picture: './pictures/dog.webp',
        emoji: '🐕',
      },
      {
        id: 'rain',
        english: "It's raining outside.",
        chinese: '外面在下雨。',
        audio: './voice/outside-08.mp3',
        picture: './pictures/rain.webp',
        emoji: '🌧️',
      },
    ],
  },
  {
    id: 'play',
    title: '玩具乐园',
    english: 'Play Park',
    emoji: '🧸',
    lessons: [
      {
        id: 'catch',
        english: 'Catch the ball.',
        chinese: '接住球。',
        audio: './voice/play-05.mp3',
        picture: './pictures/catch.webp',
        emoji: '⚽',
      },
      {
        id: 'tower',
        english: "Let's build a tower.",
        chinese: '我们搭一座塔吧。',
        audio: './voice/play-06.mp3',
        picture: './pictures/tower.webp',
        emoji: '🧱',
      },
      {
        id: 'box',
        english: 'Put it in the box.',
        chinese: '把它放进盒子里。',
        audio: './voice/tidy-01.mp3',
        picture: './pictures/box.webp',
        emoji: '📦',
      },
      {
        id: 'book',
        english: "Let's read a book.",
        chinese: '我们一起看书吧。',
        audio: './voice/family-05.mp3',
        picture: './pictures/book.webp',
        emoji: '📚',
      },
    ],
  },
];

const places = {
  snacks: [
    {
      ids: ['water', 'milk'],
      name: '给泡泡倒杯喝的',
      locations: ['小屋的餐桌', '海边野餐'],
      atHome: '在喝水的时候，放一杯水和牛奶在桌上。播放 “I need water.”，等孩子把水递过来。然后交换角色，把杯子递给她，让她听到英语真的能让你明白她想要什么。',
    },
    {
      ids: ['apples', 'eat'],
      name: '一起吃点心',
      locations: ['点心小铺', '树下的午餐'],
      atHome: '吃点心时拿起苹果，说 “I like apples.”。等到大家真的要开饭时，再说 “Let’s eat.”，一起拿起餐具。',
    },
  ],
  animals: [
    {
      ids: ['cat', 'bird'],
      name: '看看谁来了',
      locations: ['窗前的小院', '岛上的树林'],
      atHome: '散步时见到鸟，和她一起看，放一句 “Look at the bird.”。换一只鸟、换一个地方时，等她自己指给你看。',
    },
    {
      ids: ['dog', 'rain'],
      name: '去听听外面的声音',
      locations: ['院子边', '屋檐下'],
      atHome: '听到真的狗叫时，再说 “I hear a dog.”。下雨时一起看看窗外，说 “It’s raining outside.”。',
    },
  ],
  play: [
    {
      ids: ['catch', 'box'],
      name: '球要去哪儿',
      locations: ['小岛的球场', '家里的游戏角'],
      atHome: '用软球和空盒一起玩。递球给孩子时说 “Catch the ball.”，收玩具时说 “Put it in the box.”。角色换过来，让她发号施令。',
    },
    {
      ids: ['tower', 'book'],
      name: '一起玩什么',
      locations: ['游戏帐篷', '家里的地垫'],
      atHome: '拿出真的积木和绘本。邀请她一起搭塔或看书，听懂时就一起开始做。',
    },
  ],
};

// Each pair offers two actions that make sense in the same scene. The two props
// for an action represent the same meaning across visits, with a different look.
const props = {
  water: { label: '把水递给泡泡', art: 'water', outcome: '泡泡喝到水啦！' },
  milk: { label: '把牛奶递给泡泡', art: 'milk', outcome: '泡泡喝到牛奶啦！' },
  apples: { label: '递一个苹果', symbols: ['🍎', '🍏'], outcome: '泡泡拿到了苹果！' },
  eat: { label: '和泡泡一起开饭', symbols: ['🍽️', '🥣'], outcome: '大家开饭啦！' },
  cat: { label: '指给泡泡看小猫', symbols: ['🐈', '🐈‍⬛'], outcome: '泡泡看见小猫啦！' },
  bird: { label: '指给泡泡看小鸟', symbols: ['🐦', '🐤'], outcome: '泡泡和你一起看小鸟！' },
  dog: { label: '朝小狗的方向听', symbols: ['🐕', '🐩'], outcome: '原来是小狗在那里！' },
  rain: { label: '撑开雨伞', symbols: ['☂️', '🌂'], outcome: '撑起伞，雨就淋不到啦！' },
  catch: { label: '伸手接住球', symbols: ['🙌', '👐'], outcome: '接住球啦！' },
  box: { label: '把球放进盒子', symbols: ['📦', '🗃️'], outcome: '球收进盒子啦！' },
  tower: { label: '把积木搭起来', symbols: ['🧱', '🧩'], outcome: '积木搭成塔啦！' },
  book: { label: '打开书一起读', symbols: ['📕', '📘'], outcome: '泡泡坐下来和你读书啦！' },
};

export const scenes = islands.flatMap(island => places[island.id].map(scene => ({
  ...scene,
  id: scene.ids[0],
  island,
  lessons: scene.ids.map(id => ({
    ...island.lessons.find(lesson => lesson.id === id),
    prop: props[id],
    hint: `./voice/hint-${id}.mp3`,
  })),
})));
