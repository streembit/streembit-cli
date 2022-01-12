export class es6Wrapper {


    static initDatabase(database, dbschema) {
        return new Promise((resolve, reject) => {
            try {
                database.init(dbschema, (err) => {
                    if (err) {
                        reject(err);
                    }
                    resolve(true);
                })
            }
            catch (e) {
                reject(e.message);
            }
        });

    }


}
