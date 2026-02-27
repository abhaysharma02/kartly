const mongoose = require('mongoose');
const uri = 'mongodb+srv://0157cs231007_db_user:l1pgAWT5u38aNGrK@nestely.fl1xtje.mongodb.net/kartly?appName=nestely';

console.log('Testing connection to Atlas...');
mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 })
    .then(() => {
        console.log('DB SUCCESS');
        process.exit(0);
    })
    .catch(err => {
        console.error('DB FAIL:', err);
        process.exit(1);
    });
