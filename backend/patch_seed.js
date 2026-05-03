const fs = require('fs');

let content = fs.readFileSync('backend/server.js', 'utf8');

const oldSeed = `                INSERT INTO would_you_rather (option_1, option_2) VALUES 
                ('Travel to the past', 'Travel to the future'),
                ('Live without music', 'Live without TV'),
                ('Be able to fly', 'Be invisible'),
                ('Have a pause button for life', 'Have a rewind button for life'),
                ('Always have to say everything on your mind', 'Never speak again')
            \`);`;

const newSeed = `                INSERT INTO would_you_rather (option_1, option_2) VALUES 
                ('Travel to the past', 'Travel to the future'),
                ('Live without music', 'Live without TV'),
                ('Be able to fly', 'Be invisible'),
                ('Have a pause button for life', 'Have a rewind button for life'),
                ('Always have to say everything on your mind', 'Never speak again'),
                ('Be completely alone for 5 years', 'Never be alone for 5 years'),
                ('Have unlimited free food', 'Have unlimited free flights'),
                ('Be a famous director', 'Be a famous actor'),
                ('Always be 10 minutes late', 'Always be 20 minutes early'),
                ('Win the lottery', 'Live twice as long'),
                ('Never use a smartphone again', 'Never use a computer again'),
                ('Be a genius everyone thinks is an idiot', 'Be an idiot everyone thinks is a genius'),
                ('Give up sweets forever', 'Give up spicy food forever'),
                ('Have the ability to read minds', 'Have the ability to see the future'),
                ('Only be able to whisper', 'Only be able to shout'),
                ('Have a photographic memory', 'Have an extra 50 IQ points'),
                ('Never age physically', 'Never age mentally'),
                ('Live in a treehouse', 'Live in a houseboat'),
                ('Give up social media forever', 'Give up streaming services forever'),
                ('Have an unlimited gift card to a restaurant', 'Have an unlimited gift card to a clothing store'),
                ('Be able to breathe underwater', 'Be able to talk to animals'),
                ('Have your dream job but make minimum wage', 'Have a terrible job but be a millionaire'),
                ('Never wear shoes again', 'Never wear socks again'),
                ('Only eat pizza for a year', 'Only eat tacos for a year'),
                ('Always have a full battery on your phone', 'Always have a full tank of gas'),
                ('Be an olympic gold medalist', 'Be a nobel prize winner'),
                ('Never have to clean again', 'Never have to cook again'),
                ('Have the power of teleportation', 'Have the power of telekinesis'),
                ('Be best friends with your favorite celebrity', 'Win a million dollars'),
                ('Never need to sleep', 'Never need to eat'),
                ('Have an elephant as a pet', 'Have a tiger as a pet'),
                ('Live without the internet for a week', 'Live without your best friend for a week'),
                ('Be universally loved but poor', 'Be universally hated but rich'),
                ('Never be able to lie', 'Always believe every lie you hear'),
                ('Only listen to one song for the rest of your life', 'Only watch one movie for the rest of your life'),
                ('Have a time machine', 'Have a spaceship'),
                ('Be the funniest person in the room', 'Be the smartest person in the room'),
                ('Always be cold', 'Always be hot'),
                ('Have the ability to control fire', 'Have the ability to control water'),
                ('Never have to work again', 'Work at a job you absolutely love'),
                ('Be able to change the past', 'Be able to see the future'),
                ('Have a personal chef', 'Have a personal maid'),
                ('Be an amazing singer', 'Be an amazing dancer'),
                ('Live in the mountains', 'Live on the beach'),
                ('Be famous for something silly', 'Be unknown for something important'),
                ('Always wear winter clothes in summer', 'Always wear summer clothes in winter'),
                ('Have unlimited money but you can only spend it on others', 'Have $50,000 to spend only on yourself'),
                ('Never get angry', 'Never get sad'),
                ('Be able to stop time', 'Be able to fast forward time'),
                ('Live in a haunted house', 'Live in a house with no electricity'),
                ('Be a superhero', 'Be a supervillain'),
                ('Have fingers for toes', 'Have toes for fingers'),
                ('Only eat cold food', 'Only eat hot food'),
                ('Never be able to ask a question', 'Never be able to answer a question'),
                ('Have a flying carpet', 'Have a car that can drive underwater'),
                ('Be the best player on a losing team', 'Be the worst player on a winning team'),
                ('Always have a song stuck in your head', 'Always have an itch you can''t scratch'),
                ('Be able to talk to your past self', 'Be able to talk to your future self'),
                ('Have the ability to heal others', 'Have the ability to heal yourself instantly'),
                ('Live in a world with magic', 'Live in a world with advanced sci-fi technology')
            \`);`;

content = content.replace(oldSeed, newSeed);
fs.writeFileSync('backend/server.js', content);

console.log('Seed updated with 60 questions.');
