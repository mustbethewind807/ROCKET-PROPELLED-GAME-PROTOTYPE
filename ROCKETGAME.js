const { Vector, Camera, Entity, Engine} = Newton;
const debug = true;
let engine = Engine.create();
let camera;
let player;
let MOUSE = Vector.create(0, 0);

// customizable settings
// will make in-game menu to change
const SETTINGS = {
  sensitivity: 1, // amount of normal
};



document.addEventListener("contextmenu", function(e) { e.preventDefault(); });

function setup() {
  createCanvas(windowWidth, windowHeight);
  noCursor();
  camera = Camera.create({ pos: Vector.create(), w: width, h: height });
  player = Entity.create({
    pos: Vector.create(),
    w: 24,
    h: 48,
    label: 'player',
    render: function () {
      push();

      // player's body
      rectMode(CENTER);
      stroke(0);
      strokeWeight(2);
      noFill();
      rect(this.pos.x, this.pos.y, this.w, this.h);

      // Rocket launcher
      // mouse position relative to engine
      // let mouse = { x: mouseX, y: mouseY };
      let mouse = MOUSE;
      mouse = Vector.sub(mouse, { x: camera.w / 2, y: camera.h / 2 });
      mouse = Vector.add(mouse, camera.pos);

      // direction of player to mouse, normalized
      let dir = Vector.sub(player.pos, mouse);
      dir = Vector.normalize(dir);
      dir = Vector.mult(dir, -32);

      // mouse position relative to engine, normalized
      let target = Vector.add(player.pos, dir);

      // draw rocket launcher (temporary, will change texture)
      stroke(0);
      strokeWeight(8);
      line(this.pos.x, this.pos.y, target.x, target.y);

      // change facing direction
      // sloppy, will change later
      this.facing = Vector.copy(dir);

      pop();
    },
    onCollide: function (other) {
      switch (other.label) {
        case "hazard":
          // die
          break;
      }
    },
  });

  let floor = Entity.create({
    pos: Vector.create(0, 300),
    w: 100,
    h: 32,
    isStatic: true,
    label: 'wall',
    noColl: ['wall'],
  });

  let otherfloor = Entity.create({
    pos: Vector.create(100, 360),
    w: 100,
    h: 32,
    isStatic: true,
    label: 'wall',
    noColl: ['wall'],
  });

  let lowerfloor = Entity.create({
    pos: Vector.create(0, 480),
    w: 3000,
    h: 32,
    isStatic: true,
    label: 'wall',
    noColl: ['wall'],
  });

  let rightWall = Entity.create({
    pos: Vector.create(1000, 240),
    w: 32,
    h: 448,
    isStatic: true,
    label: 'wall',
    noColl: ['wall'],
  });

  let reference = Entity.create({ pos: Vector.create(0, -50), isStatic: true, label: 'wall', noColl: ['wall'], });
  engine.addEntity([player, floor, reference, lowerfloor, rightWall]);
  camera.link(player);
}

function draw() {
  background(255);

  MOUSE.x += movedX * SETTINGS.sensitivity;
  MOUSE.y += movedY * SETTINGS.sensitivity;

  MOUSE.x = constrain(MOUSE.x, 0, width);
  MOUSE.y = constrain(MOUSE.y, 0, height);

  if (!focused) {
    // if player is not focused on the game
    textSize(64);
    textAlign(CENTER, CENTER);
    text('paused', width / 2, height / 2);
    return;
  }
  
  // Prevent the player from accelerating more
  if (keyIsDown(65) && player.vel.x > -5) {
    // a
    if (player.grounded) player.applyForce({ x: -0.5, y: 0 });
    else player.applyForce({x: -0.1, y: 0 });
  }
  if (keyIsDown(68) && player.vel.x < 5) {
    // d
    if (player.grounded) player.applyForce({ x: 0.5, y: 0 });
    else player.applyForce({ x: 0.1, y: 0 });
  }

  // Jump
  if (keyIsDown(87) && player.canJump) {
    player.applyForce({ x: 0, y: -5 });
    let facing = Math.sign(player.vel.x);
    if (Math.abs(player.vel.x) > 0.3) {
      if (keyIsDown(65) && facing == -1) player.applyForce({x : -0.3, y: 0 });
      else if (keyIsDown(68) && facing == 1) player.applyForce({x: 0.3, y: 0 });
    } else {
      player.vel.x = 0;
    }
  }

  engine.update();
  camera.update();
  engine.render(camera);

  // After engine stuff
	// Render the crosshair(?)
	push();
	translate(MOUSE.x, MOUSE.y);
  stroke(0);
  strokeWeight(4);
	// point(MOUSE.x, MOUSE.y);
	line(0, 10, 0, 5);
	line(0, -10, 0, -5);
	line(10, 0, 5, 0);
	line(-10, 0, -5, 0);
	pop();
  
  if (player.rockets < 3) {
    player.rocketCharge++;
  }
  if (player.rocketCharge > player.rocketChargeLimit) {
    player.rockets++;
    player.rocketCharge = 0;
  }

  if (debug) {
    textSize(14);
    textAlign(LEFT, CENTER);
    noStroke();
    fill(0);
    text(`FPS: ${Math.floor(frameRate())}`, 32, 50);
    text(`Entities: ${engine._entities.length}`, 32, 75);
    text(
      `Player pos: ${player.pos.x.toFixed(2)}, ${player.pos.y.toFixed(2)}`,
      32,
      100
    );
    text(
      `Player vel: ${player.vel.x.toFixed(2)}, ${player.vel.y.toFixed(2)}`,
      32,
      125
    );

    textAlign(RIGHT, CENTER);
    text(`Health: ${player.health}`, width - 32, 50);
    text(`Rockets: ${player.rockets}`, width - 32, 75);
    text(`Rocket charge: ${player.rocketCharge}`, width - 32, 100);
  }
}

function mousePressed() {
  if (mouseButton == LEFT) {
    if (player.rockets <= 0) return;
    // shoot rocket
    player.rockets--;
    let rocket = Entity.create({
      pos: Vector.add(player.pos, Vector.mult(player.facing, 1.5)),
      vel: Vector.copy(player.facing),
      w: 16,
      h: 16,
      gravityAffected: false,
      label: 'rocket',
      noColl: ['rocket'],
      friction: 0,
  
      onCollide: function () {
        if (this.collided) return;
        let pushDist = 500; // arbitrary value
        for (let other of engine._entities) {
          // skip items of no explosion
          if (other.label == 'rocket') continue;
          if (other.isStatic) continue;
          
          // collides with explosion
          let testX, testY;
          if (this.pos.x < other.pos.x - other.halfw) {
            testX = other.pos.x - other.halfw;
          } else if (this.pos.x > other.pos.x + other.halfw) {
            testX = other.pos.x + other.halfw;
          } else {
            testX = other.pos.x;
          }
          
          if (this.pos.y < other.pos.y - other.halfh) {
            testY = other.pos.y - other.halfh;
          } else if (this.pos.y > other.pos.y + other.halfh) {
            testY = other.pos.y + other.halfh;
          } else {
            testY = other.pos.y;
          }
          
          let distX = this.pos.x - testX;
          let distY = this.pos.y - testY;
          let distSq = (distX * distX) + (distY * distY);
          
          if (distSq < (pushDist * pushDist)) {
            // push
            let dir = Vector.sub(other.pos, this.pos);
            let dist = Math.sqrt(distSq);
            let percentage = dist / pushDist;
            let power = lerp(10, 0, percentage);
            dir = Vector.normalize(dir);
            dir = Vector.mult(dir, power);
            other.applyForce(dir);

            if (other.label == 'player') console.log(power);
          }
        }
        stroke(0);
        strokeWeight(2);
        noFill();
        push();
        translate(-camera.pos.x + camera.halfw, -camera.pos.y + camera.halfh);
        circle(this.pos.x, this.pos.y, pushDist * 2);
        pop();
        this.collided = true;
        engine.removeEntity(this);
      },
    });
  
    engine.addEntity(rocket);
  }
}

function doubleClicked() {
  // fullscreen(true);
  requestPointerLock();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  camera.w = width;
  camera.h = height;
}
