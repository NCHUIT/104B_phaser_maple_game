jQuery(document).ready(function($) {
  var game = {
  new: function(witdh, height, canvas_selector){
    this.phaser = new Phaser.Game(witdh, height, Phaser.AUTO, canvas_selector, this)
  },
  preload: function(){
    //載入需要用到的資源
    var phaser = this.phaser;
    phaser.load.image('sky', 'assets/bg.jpg');
    phaser.load.image('star', 'assets/star.png');
    phaser.load.spritesheet('player', 'assets/Archer_shoot.png', 110, 160);
    phaser.load.spritesheet('monster', 'assets/baddie.png', 32, 32);  
    phaser.load.tilemap('map', 'tilemap/map.json', null, Phaser.Tilemap.TILED_JSON);
    phaser.load.image('kenney', 'tilemap/kenney.png');
    phaser.load.image('arrow', 'assets/arrow.png' , 70, 17);
  },
  create: function(){
    //  啟用Arcade物理引擎
    var phaser = this.phaser;
    phaser.physics.startSystem(Phaser.Physics.ARCADE);

    //加入背景 並宣告背景物件
    var background = phaser.add.sprite(0, 0, 'sky');
    background.fixedToCamera = true; //!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

    // 加入地圖 宣告地圖物件
    var map = phaser.add.tilemap('map');
    map.addTilesetImage('kenney');  //kenny為地圖素材
    map.setCollision(PhaserHelper.getCollisionIndexes(phaser, 'map')); // 設定"碰撞"性質

    var layer = map.createLayer('layer1');
    layer.bringToTop();
    layer.resizeWorld();

    var tiles = map.layers[0].data

    // 設定背景和地圖同大小
    background.height = layer.height
    background.width = layer.width

    // 加入人物並宣告player物件
    var player = phaser.add.sprite(110, 160, 'player');
    player.scale.setTo(0.6,0.6)            //  將人物縮小
    phaser.physics.arcade.enable(player);  //  啟用人物的物理效果

    // 設定人物與世界邊界碰撞、重力場強度
    player.body.collideWorldBounds = true;
    player.body.gravity.y = 1200;

    // 向左向右 人物移動時的動畫效果
    player.animations.add('left', [2, 3, 4, 5], 10, true);
    player.animations.add('right', [7, 8, 9, 10], 10, true);
    player.animations.add('shoot_left', [0,1], 5, true);
    player.animations.add('shoot_right', [12,11], 5, true);
    player.bringToTop
    phaser.camera.follow(player);
    // 設定地圖中方塊的碰撞面
    player.body.checkCollision.up = false;
    player.body.checkCollision.left = false;
    player.body.checkCollision.right = false;
    //讓自己擁有生命力
    player.Health = 0;
    //  加入group 宣告整個為stars物件
    var stars = phaser.add.group();
    stars.enableBody = true;  //  為group裡的每顆星星套上物理引擎
    stars.bringToTop;

    //  等距離橫向分布12顆星星
    for (var i = 0; i < 12; i++)
    {
      var star = stars.create(i * 70, 0, 'star');      //  加入星星並設定座標
      star.body.gravity.y = 300;                       //  為stars設定重力場
      star.body.bounce.y = 0.7 + Math.random() * 0.2;  //  利用Math.random()給予每顆星星不同的彈力
    }

    // 宣告以下物件，因為他們還會被其他function使用到
    this.map = map;
    this.layer = layer;
    this.tiles = tiles;
    this.player = player;
    this.stars = stars;

    // ===============  賦予怪物生命 & basics ===============
    //pay attention to the declaration form and order!!!
    //注意宣告方式以及順序
    this.pointer_down = false;
    this.monsterRunningCount = 45;
    this.monsterTotalHealth = 33;
    this.player.killMeCD = 150;
    this.arrows = [];
    this.monsters = [];
    this.firetime = 0;
    this.playtime = 0;
    this.gameover = false;
    //時間
    // this.timer = game.time.create(false);
    // timer.loop(1000, updateCounter, this);
    var intervalID = setInterval(function () {
      this.playtime ++;
      // console.log(this);
    }.bind(this), 1000);

    for (var i = 0; i <= 10; i++) {
      //加入怪物 宣告怪物物件
      var x = phaser.world.randomX;
      var y = phaser.world.randomY;
      if (x >= 1200)
        x = 1200;
      else if (x < 200)
        x = 200;
      var monster = phaser.add.sprite( x, y - 350, 'monster');
      phaser.physics.arcade.enable(monster);
      monster.body.bounce.y = 0.2;
      monster.body.gravity.y = 300;
      monster.body.collideWorldBounds = true;

      //怪物移動時的動畫效果及碰撞
      monster.animations.add('left', [0, 1], 10, true); 
      monster.animations.add('right', [2, 3], 10, true);
      monster.bringToTop();
      monster.body.checkCollision.up = false;
      monster.body.checkCollision.left = true;
      monster.body.checkCollision.right = true;
      monster.body.checkCollision.down = true;

      //怪物出現時的移動方向
      if (x <= 700) {
        monster.body.velocity.x = 100;
        monster.animations.play('right');
      }
      if (x > 700) {
        monster.body.velocity.x = -100;
        monster.animations.play('left');
      }

      //將以上創造出來的怪物一個個推進沙坑（？
      this.monsters.push({
        monster : monster,
        health : 3,
        alive : true
      })
    }
    // =================  左上角加入一個記分板  ================
    var blood = this.phaser.add.text(16, 16, 'Health:', { fontSize: '32px' });
    blood.fixedToCamera = true;
    blood.font = 'Arial';
    blood.align = 'center';
    blood.setShadow(2, 2, '#373331', 1);
    this.blood = blood;
  },
  update: function(){
    // update將會以每秒三十次之頻率更新畫面

    // 宣告之前使用過的物件
    var phaser = this.phaser;
    var player = this.player;
    var layer = this.layer;
    var stars = this.stars;
    var monsters = this.monsters;
    var arrows = this.arrows;

    //  人物與地圖物件之間的碰撞
    var touching_ground = phaser.physics.arcade.collide(player, layer);
    phaser.physics.arcade.collide(stars, layer);
    phaser.physics.arcade.collide(arrows, layer, function(arrow, layer) {
          // 箭要消失喔
          arrow.kill();
    });
    //  偵測人物與星星，如果重疊將會call collectStar function來計算分數
    phaser.physics.arcade.overlap(player, stars, this.collectStar, null, this);
    //  人物的初速度
    player.body.velocity.x = 0;

    // ============================ 人物移動、動畫 =================================
    if (game.input.keyboard.isDown(Phaser.Keyboard.A)) // 若按壓A鍵
    {
      //  以-150的速度移動
      player.body.velocity.x = -150;

      player.animations.play('left');

      // 若未觸地則stop
      if (!touching_ground) 
      {
        player.animations.stop();
        if (player.frame < 6) {
          player.frame = 2;   // 設定人物的面向
        }
      }
    }
    else if (game.input.keyboard.isDown(Phaser.Keyboard.D))
    {
      player.body.velocity.x = 150;

      player.animations.play('right');

      if (!touching_ground) 
      {
        player.animations.stop();
        if (player.frame >= 6) {
          player.frame = 10;
        }
      }
    }
    else
    {
      //  若未按壓任何按鍵時
      player.animations.stop();
      if (player.frame < 6) 
      {
        player.frame = 5;
      }
      if (player.frame >= 6)
      {
        player.frame = 7;
      }
    }
    // 觸地瞬間跳躍
    if (game.input.keyboard.isDown(Phaser.Keyboard.W) && touching_ground)
    {
      player.body.velocity.y = -720;
    }
    // ===============  發射動畫  ================
    // 延長射擊時間
    this.firetime -= 1;

    // 按著滑鼠左鍵時出現拉弓動作
    if (game.input.activePointer.isDown && this.firetime <= 0) 
    {
      this.pointer_down = true;
      if(player.frame < 6)
        player.frame = 1;
      else
        player.frame = 11;
    }
    // 放開左鍵時放箭
    else if(this.pointer_down)
    {
      this.pointer_down = false;
      var fire_point = {x: player.x + 33, y: player.y + 48};  // 設定發射點
      var rotation = phaser.physics.arcade.angleToPointer(fire_point);    // 設定發射點與滑鼠之間的角度
      // console.log(rotation);
      if(player.frame < 6 && Math.abs(rotation) > Math.PI / 2)
      {
        player.frame = 0;
        this.fire(fire_point.x, fire_point.y, rotation);
        this.firetime = 30;
      }
      else if(player.frame >= 6 && Math.abs(rotation) < Math.PI / 2)
      {
        player.frame = 12;
        this.fire(fire_point.x, fire_point.y, rotation);    // 呼叫 fire function 來發射子彈
        this.firetime = 30;
      }
    }
    // ===============  發射動畫END  ===============
    // ================  人物控制結束   ================

    // ===================  怪物的AI  =====================
    this.monsterRunningCount --;  // 用來改變方向 
    this.player.killMeCD --;  // 怕你死太快 XD

    for (var i = 0; i <= 10; i++) 
    {
      if (monsters[i].alive) 
      {
        //怪物不是外星生物,也會碰撞RRRRRRRR
        phaser.physics.arcade.collide(monsters[i].monster, layer);

        //如果你碰到怪物ㄜ 你就準備 say bye bye ～～
        if(this.player.killMeCD <= 0)
        {
          phaser.physics.arcade.overlap(player, monsters[i].monster, function(){
            this.player.Health -= 8;
            this.player.killMeCD = 60;
            // console.log("cd: " + this.player.killMeCD);
            // console.log("hp: " + this.player.Health);
          },null,this);
        }

        // 箭跟怪物的互動
        phaser.physics.arcade.overlap(arrows, monsters[i].monster, function(arrow, monster) {
          // 箭要消失喔
          arrow.kill();
          monsters[i].health --;  // 心好痛
          this.monsterTotalHealth --; // 一步步走向滅絕
          // 沒血了 bye 囉
          if(monsters[i].health <= 0)
          {
            monsters[i].alive = false;
            monsters[i].monster.kill();
          }
        }, null, this);

        //跑跑跑～～～向前跑 左右左右跑
        if (this.monsterRunningCount == 0) 
        {
          monsters[i].monster.body.velocity.x *= -1;
          if(monsters[i].monster.body.velocity.x > 0)
            monsters[i].monster.animations.play('right');
          else
            monsters[i].monster.animations.play('left');
        }
      }
    }
    // ======================  left & right  =====================
    if (this.monsterRunningCount < 0) {
      this.monsterRunningCount = 90;
    }
    // =========================  AI 結束  ========================
    // =======================  show 出血量  ======================
    this.showHealth();

    // ============================================================
    // 隱藏版
    if (game.input.keyboard.isDown(Phaser.Keyboard.O) && player.Health >= 0)
    {
      monsters.forEach(function (e, i) {monsters[i].monster.kill();});
      this.monsterTotalHealth = 0;
      this.player.Health = "Ultra";
      this.fire(0, 460, 0, "o");
      this.firetime = 30;
      stars.visible = false
    }
  },
  collectStar: function (player, star){
    star.kill();
    this.player.Health += 10;
  },
  showHealth: function() {
    var color;
    // ======================  變更血條顏色  ========================
    if (this.player.Health < 40 || this.player.Health == "Dead")
      color = '#DA1212';
    else if (this.player.Health >= 40 && this.player.Health < 80)
      color = '#E4663A';
    else if (this.player.Health >= 80 && this.player.Health <= 120)
      color = '#17E7A4';
    else if (this.player.Health == "Ultra")
      color = '#17E7A4';
    // ========================  結果訊息  =======================
    if (this.gameover == false) {
      if (this.monsterTotalHealth == 0)
      {
        this.gameover = true;
        window.clearInterval(this.intervalID);
        this.createText("You Win (●´ω｀●)ゞ\ntime: " + this.playtime + " secs",'w');
      }
      if (this.player.Health < 0) {
        this.player.kill();
        this.gameover = true;
        this.player.Health = "Dead";
        this.createText("You Lose (;´༎ຶД༎ຶ`)\ntime: " + this.playtime + " secs",'l');
        // use createText function to create texts
      }
      this.blood.text = 'Health: ' + this.player.Health;
      this.blood.fill = color;
    }
  },
  createText: function (text, result) {
    //  遊戲結果訊息
    var color;
    if(result == 'w')          //贏了
      color = '#17EAD9';
    else if(result == 'l')
      color = '#EB2632';     //哭哭
    var note = this.phaser.add.text( this.phaser.width/2-300, this.phaser.height/2 - 50, text, { fontSize: '65px', fill: color });
    note.fixedToCamera = true;
    note.font = 'Arial';
    note.align = 'center';
    note.setShadow(2, 2, '#3E3E3E', 1);
  },
  fire :  function  (x, y, rotation, o) {
    // 放箭要做的事情 +.+
    var phaser = this.phaser;
    var arrow = phaser.add.sprite(x, y, 'arrow');
    arrow.rotation = rotation;
    arrow.currentSpeed = 750;
    arrow.anchor.setTo(-0.5, -0.5);
    phaser.physics.arcade.enable(arrow);
    if (o == "o") {
      arrow.scale.setTo(5, 5);
      arrow.currentSpeed = 1200;
    }
    phaser.physics.arcade.velocityFromRotation(arrow.rotation, arrow.currentSpeed, arrow.body.velocity);  
    // 用發射點與滑鼠之間的角度來產生速度
    arrow.outOfBoundsKill = true;
    this.arrows.push(arrow);
  },
  };

  $('#predimmer').modal('setting', 'closable', false).modal('show');
  $('#yes').click(function() {
    $('#predimmer').modal('hide');
    game.new($(document).width(), $(document).height(), 'game');
  });
  
});
