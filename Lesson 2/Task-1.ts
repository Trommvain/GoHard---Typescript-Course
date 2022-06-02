interface iEmitter {
  events?: object,
  on?(type: string, handler: string): iEmitter,
  off?(type: string, handler: string): iEmitter,
  trigger?(event: string | eventFunc, handler: string): void,
  _dispatch?(event: dispatchEvent, args: dispatchEvent[] | []): iEmitter | void,
  _offByHandler?(type: string, handler: string): iEmitter | void,
  _offByType?(type: string): iEmitter,
  _offAll?(): iEmitter
}

type eventFunc = {
  new (type: string | eventFunc): void
}

type dispatchEvent = {
  type: string,
}

var emitter: iEmitter = {};

function Emitter(): void {
  var e = Object.create(emitter);
  e.events = {};
  return e;
}

function EventFunc(type: string | eventFunc): void {
  this.type = type;
  this.timeStamp = new Date();
}

emitter.on = function(type, handler) {
  if (this.events.hasOwnProperty(type)) {
    this.events[type].push(handler);
  } else {
    this.events[type] = [handler];
  }
  return this;
};

emitter.off = function(type, handler) {
  if (arguments.length === 0) {
    return this._offAll();
  }
  if (handler === undefined) {
    return this._offByType(type);
  }
  return this._offByHandler(type, handler);
};

emitter.trigger = function(event: eventFunc, args) {
  if (!(event instanceof EventFunc)) {
    event = new EventFunc(event);
  }
  return this._dispatch(event, args);
};

emitter._dispatch = function(event, args) {
  if (!this.events.hasOwnProperty(event.type)) return;
  args = args || [];
  args.unshift(event);

  var handlers = this.events[event.type] || [];
  handlers.forEach(handler => handler.apply(null, args));
  return this;
};

emitter._offByHandler = function(type, handler) {
  if (!this.events.hasOwnProperty(type)) return;
  var i = this.events[type].indexOf(handler);
  if (i > -1) {
    this.events[type].splice(i, 1);
  }
  return this;
};

emitter._offByType = function(type) {
  if (this.events.hasOwnProperty(type)) {
    delete this.events[type];
  }
  return this;
};

emitter._offAll = function() {
  this.events = {};
  return this;
};

Emitter.Event = Event;

Emitter.mixin = function(obj: object, arr: Array<string | number>): void {
  var emitter: void = new Emitter();
  arr.map(function(name: string | number){
    obj[name] = function(){
      return emitter[name].apply(emitter, arguments);
    };
  });
};