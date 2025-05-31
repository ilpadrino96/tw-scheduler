(() => {
  const f = document.getElementById("command-data-form");
  if (!f) return alert("You must be on the command confirmation page!");
  if (!document.getElementById("sTbl")) {
    const d = f.querySelector("div"), w = document.createElement("div");
    w.id = "fw";
    w.style.display = "flex";
    w.style.flexDirection = "row";
    w.style.alignItems = "flex-start";
    w.style.gap = "20px";
    w.style.marginBottom = "20px";
    f.insertBefore(w, d);
    w.appendChild(d);
    const t = document.createElement("table");
    t.id = "sTbl";
    t.className = "vis";
    t.width = "460";
    t.innerHTML = `<thead><tr><th colspan=2>Programeaza atacul</th></tr></thead><tbody><tr><td>Mode:</td><td><input name=m type=radio value=arrival checked> Arrival<input name=m type=radio value=launch> Launch</td></tr><tr><td>Date:</td><td><input name=d type=date required style="width:150px"></td></tr><tr><td>Time:</td><td><input name=h type=number min=0 max=23 required style="width:40px"> :<input name=i type=number min=0 max=59 required style="width:40px"> :<input name=s type=number min=0 max=59 required style="width:40px"> :<input name=ms type=number min=0 max=999 required style="width:40px"></td></tr><tr><td>Launch:</td><td id=lt style="color:green;font-weight:bold"></td></tr><tr><td>Arrival:</td><td id=at></td></tr><tr><td>Return:</td><td id=rt></td></tr></tbody>`;
    w.appendChild(t);
  }
  let b = document.getElementById("bSv");
  if (!b) {
    b = document.createElement("button");
    b.id = "bSv";
    b.className = "btn";
    b.type = "button";
    b.textContent = "⌛Salveaza";
    document.getElementById("command-data-form").appendChild(b);
  }
  let to;
  b.onclick = () => {
    if (!f.reportValidity()) return;
    const d = new Date(document.querySelector('input[name=d]').value);
    d.setHours(document.querySelector('input[name=h]').value);
    d.setMinutes(document.querySelector('input[name=i]').value);
    d.setSeconds(document.querySelector('input[name=s]').value);
    d.setMilliseconds(document.querySelector('input[name=ms]').value);
    const td = 1e3 * f.querySelector(".relative_time").dataset.duration,
      isArr = document.querySelector('input[name=m]:checked').value === "arrival",
      lt = isArr ? new Date(d.getTime() - td) : d,
      at = isArr ? d : new Date(d.getTime() + td),
      rt = new Date(1e3 * Math.floor(at.getTime() / 1e3) + td);
    clearTimeout(to);
    let delay = lt.getTime() - Math.round(Timing.getCurrentServerTime());
    if (delay < 0) delay = 0;
    const fT = d => d instanceof Date ? window.Format.date(d / 1e3, !0) + ":" + window.Format.padLead(d.getUTCMilliseconds(), 3) : "";
    const sT = (id, t) => {
      let e = document.getElementById(id);
      if (e) e.textContent = t;
    };
    sT("lt", fT(lt));
    sT("at", fT(at));
    sT("rt", fT(rt));
    to = setTimeout(() => HTMLFormElement.prototype.submit.call(f), delay);
  };
})();
