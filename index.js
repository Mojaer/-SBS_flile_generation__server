const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 5000


app.use(express.json());
app.use(cors());
require('dotenv').config()

//data codes 
const H_S_Codes = ['12901', '12902', '12903', '12904', '12905', '12906', '12907', '12908', '12909', '12910', '12911', '12912', '12913']
const V_S_Codes = ['12110', '12120', '12500', '12210', '12220', '12230', '12240', '12250', '12330', '12340', '12350', '12360', '12370', '12380', '12390']

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_ACC}:${process.env.DB_PASS}@cluster0.8odccbh.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        const database = client.db("PGDIT_project");
        const allDataCollection = database.collection("allData");
        // data saved to collection and the specified collection month
        app.post('/accdata', async (req, res) => {
            const data = req.body;
            // console.log(data.data.length);
            const month = data.month
            const monthCollection = database.collection(`${month}`)
            data.data.map(async (data) => {
                const Acc = {
                    Ac_NO: data.Ac_NO, Ac_Name: data.Ac_Name,
                    H_S_Code: data.H_S_Code, V_S_Code: data.V_S_Code
                }

                //filter the inserted data is already in the alldatabase table
                const query = { Ac_NO: data.Ac_NO }
                const matchedAcc = await allDataCollection.findOne(query)
                if (!matchedAcc) {
                    const results = await allDataCollection.insertOne(Acc)
                }
            })

            //search for the data collection to be previously inserted
            const previousData = await monthCollection.find().toArray()
            if (previousData.length != 0) {
                res.send({ message: 'You have already inserted the file' })
            }
            else {
                const result2 = await monthCollection.insertMany(data.data)
                res.send(result2)
                // console.log(result2)
            }
        })

        // request to add all daa
        app.get('/allData', async (req, res) => {
            const result = await allDataCollection.find().toArray()
            res.status(200).send(result)
        })
        // to get monthly the data form the data collection
        app.get('/data', async (req, res) => {
            const month = req.query
            const monthCollection = database.collection(`${month.month}`)
            const result = await monthCollection.find().toArray()
            if (result.length === 0) {
                res.status(404).json({ error: true, message: 'Data ss Not Found For This Month' })
            } else {
                res.status(200).send({ error: false, data: result })
            }
        })

        // update the codes from the previous collection
        app.patch('/data', async (req, res) => {
            const { month } = req.query
            const { data } = req.body
            // console.log(data.length)
            data.map(async (item, index) => {
                const query = { Ac_NO: item.Ac_NO }
                const dataFromCollection = await allDataCollection.findOne(query)
                // console.log(month, index)
                const updateDoc = {
                    $set: {
                        H_S_Code: dataFromCollection.H_S_Code || '---',
                        V_S_Code: dataFromCollection.V_S_Code || '---'
                    },
                };
                const monthCollection = database.collection(`${month}`)
                if (monthCollection) {
                    const filter = { _id: new ObjectId(item._id) }
                    const result = await monthCollection.updateOne(filter, updateDoc)

                }

            })
            res.send({ message: 'updated successfully' });
        })

        app.patch('/codeUpdate', async (req, res) => {
            const { month } = req.query
            const { vs_code, hs_code, Ac_NO } = req.body
            // console.log(hs_code, vs_code, Ac_NO)
            const query = { Ac_NO: Ac_NO }
            const updateDoc = {
                $set: {
                    H_S_Code: hs_code,
                    V_S_Code: vs_code
                },
            };
            const monthCollection = database.collection(`${month}`)

            const result1 = await monthCollection.updateOne(query, updateDoc)
            const result2 = await allDataCollection.updateOne(query, updateDoc)
            res.send(result1)
        })

        //sbs_data collection 
        app.get('/sbs_data', async (req, res) => {
            const { month } = (req.query)
            const monthCollection = database.collection(`${month}`)
            const monthlyData = await monthCollection.find().toArray()
            // console.log(data)
            const SBS_fileData = []
            H_S_Codes.map((HS) => {
                const codesData = { code: HS }
                const H_S_data = monthlyData.filter((data) => data.H_S_Code === codesData.code)
                // console.log(H_S_data)
                V_S_Codes.map(code => {
                    const data = H_S_data.filter(data => parseInt(data.V_S_Code) === parseInt(code))
                    // console.log(data)
                    const sum = data.reduce((sum, each) => {
                        return sum + parseFloat(each.Amount)
                    }, 0)
                    const key = `s${code}s`
                    codesData[key] = sum.toFixed(2)

                })
                // console.log(codesData)
                SBS_fileData.push(codesData)
            })

            res.status(200).send({ data: SBS_fileData })

        })


        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('running')
});

app.listen(port, () => {
    console.log('listening on port http://localhost:%d', port)
});