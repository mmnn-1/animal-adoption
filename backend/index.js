const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const multer = require('multer');
const path = require('path');
const app = express();
const port = 3000;

app.use(cors());  // 這行加上去，允許所有來自不同來源的請求


app.use(express.json());

// 資料庫連線設定nod
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'Mm8780461', // ✅ 改成你自己 MySQL 的密碼
  database: 'qq'   // ✅ 改成你建立的資料庫名稱
});

// 測試連線
db.connect((err) => {
  if (err) {
    console.error('資料庫連線失敗：', err);
  } else {
    console.log('已連線到資料庫');
  }
});
// 註冊 API
app.post('/register', (req, res) => {
  const { username, password } = req.body;

  // 先檢查帳號是否已存在
  db.query('SELECT * FROM users WHERE username = ?', [username], (err, results) => {
    if (err) return res.status(500).send('資料庫錯誤');

    if (results.length > 0) {
      return res.status(400).send('帳號已存在');
    }

    // 新增帳號
    db.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, password], (err, results) => {
      if (err) return res.status(500).send('註冊失敗');
      res.send('註冊成功');
    });
  });
});

// 登入 API
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  db.query(
    'SELECT  id,username,role FROM users WHERE username = ? AND password = ?',
    [username, password],
    (err, results) => {
      if (err) return res.status(500).send('資料庫錯誤');

      if (results.length > 0) {
        const user = results[0];
        return res.json ({
          msg:"登入成功",
          userId:user.id,
         role:user.role
      });
    }
   return res.status(401).send('帳號或密碼錯誤')
    }
  );
});
//圖片上傳設定

const storage = multer.diskStorage({
  destination:(req,file,cb)=>{
    cb(null,'upload/');
  },
  filename:(req,file,cb)=>{
    cb(null,Date.now()+path.extname(file.originalname));
  }
});
const upload = multer({storage});
//對外公開資料夾
app.use('/uploads',express.static('upload'));
app.post('/admin/animals',upload.single('image'),(req,res)=>{
  const{type,breed,age,size,gender,monthly_cost,traits}=req.body;
  const image_url = req.file?`/uploads/${req.file.filename}`:null;
  const sql =`
  INSERT INTO animals(type,breed,age,size,gender,monthly_cost,image_url)
  VALUES(?,?,?,?,?,?,?)`
  db.query(sql,[type,breed,age,size,gender,monthly_cost||null,image_url],(err,result)=>{if(err)return res.status(500).json({error:'新增失敗',details:err});
const animalId = result.insertId;
if(traits){
  const traitList =Array.isArray(traits)?traits:[traits];
  traitList.forEach(traitID=>{
    db.query(
      'INSERT INTO animal_traits (animal_id, trait_id) VALUES (?, ?)',
            [animalId, traitID]
          );
        });
      }

      res.json({ message: '動物新增成功', animal_id: animalId });
    }
  );
    
});
app.get('/animals',(req,res)=>{
  const sql = `
  SELECT * FROM animals
  WHERE adopted=0
  `;
  db.query(sql,(err,results)=>{
    if(err)return res.status(500).send("資料庫錯誤");
    res.json(results); 
  });
});

app.post("/adopt",(req,res)=>{
  const {user_id,animal_id} = req.body;
//寫入領養紀錄
  const insertsql = "INSERT INTO adoptions(user_id,animal_id)VALUES(?,?)";
  db.query(insertsql,[user_id,animal_id],(err,result)=>{
    if(err)return res.status(500).json({error:err});
    //更新領養狀態為已領養
    const updatesql = "UPDATE animals SET adopted=1 WHERE id=?";
    db.query(updatesql,[animal_id],(err2,result)=>{
      if(err2)return res.status(500).json({error:err2});
      res.json({msg:"領養成功!"});
    })
    
  });
  
});
app.get("/my-adoptions",(req,res)=>{
  const userId = req.query.user_id;
  const sql = `
  SELECT a.id,a.breed,a.type,a.image_url
  FROM adoptions ad
  JOIN animals a ON ad.animal_id = a.id
  where ad.user_id=?

  `;
  db.query(sql,[userId],(err,rows)=>{
  if(err)return res.status(500).json({error:err});
  res.json(rows);
});
});
//推薦系統分數計算
app.post("/api/recommend",(req,res)=>{
  console.log("收到推薦請求：", req.body);
  const levelMap = {
    low:1,
    medium:2,
    high:3
  };
  const user = req.body;
  db.query(
    "SELECT * FROM animal_profiles WHERE type=?",
    [user.type],
    (err,profiles)=>{
      if(err)return res.status(500).json(err);
      const result = profiles.map(p=>{
        let score=0;
        if(p.avg_monthly_cost!=0 && p.avg_monthly_cost<=user.avg_monthly_cost)score+=2;
        if(p.activity_level===user.activity_level)score+=2;
        
        if(levelMap[p.grooming_level]<=levelMap[user.grooming_level])score+=1;
        if(levelMap[p.space_requirement]<=levelMap[user.space_requirement])score+=2;
        if(levelMap[p.noice_level]<=levelMap[user.noice_level])score+=1;
        if(levelMap[p.time_commitment]<=levelMap[user.time_commitment])score+=2;
        if(levelMap[p.shedding_level]<=levelMap[user.shedding_level])score+=1;
        if(p.suitable_for===user.suitable_for)score+=2;

        return {...p,score}

      });
      result.sort((a,b)=>b.score - a.score);
      res.json(result.slice(0,3));
    }
  );
});
app.listen(port, () => {
  console.log(`後端服務啟動：http://localhost:${port}`);
});
