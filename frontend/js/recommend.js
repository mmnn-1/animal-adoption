

console.log("recommend.js已載入");
const form = document.getElementById("recommendForm");
const resultSection = document.getElementById("resultSection");
const resultList = document.getElementById("resultList");
form.addEventListener("submit",function(e){
    e.preventDefault();//不讓表單真的送出換頁
    //取得表單資料
    const formData = new FormData(form);
    //cheeckbox要特別處理
    const traits=[];
    document.querySelectorAll('input[name="traits"]:checked')
    .forEach(cb=>traits.push(cb.value));

    //整理成一個物件送給後端
    const data={
        type:formData.get("type"),
        avg_monthly_cost:Number(formData.get("avg_monthly_cost")),
        activity_level:formData.get("activity_level"),
        space_requirement:formData.get("space_requirement"),
        noice_level:formData.get("noice_level"),
        shedding_level:formData.get("shedding_level"),
        time_commitment:formData.get("time_commitment"),
        suitable_for:formData.get("suitable_for"),
        traits:traits

    };
    console.log("使用者填寫資料:",data);
    //之後這裡會接後端api
    fetch("http://localhost:3000/api/recommend",{
        method:"POST",
        headers:{
            "Content-Type":"application/json"
        },
        body:JSON.stringify(data)


    })
    .then(res=>res.json())
    .then(result=>{
        console.log("推薦結果:",result);
            //清空舊結果
    resultList.innerHTML="";
    //顯示推薦的區塊
    resultSection.style.display = "block";
    //如果沒有推薦
    if(result.length==0){
        resultList.innerHTML="<p>找不到適合的寵物</p>";
        return;
    }

    //產生推薦的卡片
    result.forEach(pet=>{
        const card = document.createElement("div");
        card.className = "pet-card";

        card.innerHTML=`
        <h3>${pet.breed}</h3>
        <p>類型:${pet.type}</p>
        <p>活動量:${pet.activity_level}</p>
        <p>空間需求:${pet.space_requirement}</p>
        <p>時間投入:${pet.time_commitment}</p>
        <p>推薦分數:<strong>${pet.score}</strong></p>
        `;
        resultList.appendChild(card);
    
    });


})
    .catch(err=>{
        console.error("推薦失敗:",err);
        alert("送出失敗,請確認後端是否啟用");
    });


});