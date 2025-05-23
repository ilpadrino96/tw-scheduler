function waitForGlobals(callback) {
  if (typeof Timing !== "undefined" && Timing.getCurrentServerTime && window.Format) {
    callback();
  } else {
    setTimeout(() => waitForGlobals(callback), 100);
  }
}

waitForGlobals(() => {
  const contentValue = document.getElementById("content_value");
  if (!contentValue) return alert("#content_value not found");

  const form = contentValue.querySelector("form");
  if (!form) return alert("form inside #content_value not found");

  const existingDiv = form.querySelector("div");
  if (!existingDiv) return alert("Existing div with first table not found");

  // Create flex wrapper if not exists
  let flexWrapper = form.querySelector("#flex-wrapper");
  if (!flexWrapper) {
    flexWrapper = document.createElement("div");
    flexWrapper.id = "flex-wrapper";
    flexWrapper.style.display = "flex";
    flexWrapper.style.flexDirection = "row";
    flexWrapper.style.alignItems = "flex-start";
    flexWrapper.style.gap = "20px";
    flexWrapper.style.marginBottom = "20px";

    form.insertBefore(flexWrapper, existingDiv);
    flexWrapper.appendChild(existingDiv);
  }

  if (!document.getElementById("schedule-table")) {
    const scheduleTable = document.createElement("table");
    scheduleTable.id = "schedule-table";
    scheduleTable.className = "vis";
    scheduleTable.width = "460";

    scheduleTable.innerHTML = `
      <thead>
        <tr><th colspan="2">Programează Atacul 🎯🌽</th></tr>
      </thead>
      <tbody>
        <tr>
          <td>Mod:</td>
          <td>
            <input name="sa-mod" type="radio" value="arrival" checked> Soseste la
            <input name="sa-mod" type="radio" value="launch"> Lanseaza la
          </td>
        </tr>
        <tr>
          <td>Data:</td>
          <td><input name="sa-d" type="date" required style="width: 150px;"></td>
        </tr>
        <tr>
          <td>Ora:</td>
          <td>
            <input name="sa-t-h" type="number" min="0" max="23" style="width:40px" required> :
            <input name="sa-t-m" type="number" min="0" max="59" style="width:40px" required> :
            <input name="sa-t-s" type="number" min="0" max="59" style="width:40px" required> :
            <input name="sa-t-ms" type="number" min="0" max="999" style="width:40px" required>
          </td>
        </tr>
        <tr><td>Lansare:</td><td id="sa-launch" style="color:green; font-weight:bold;"></td></tr>
        <tr><td>Sosire:</td><td id="sa-arrival"></td></tr>
        <tr><td>Intoarcere:</td><td id="sa-return"></td></tr>
        <tr><td>Countdown:</td><td id="sa-countdown" style="font-weight:bold; color:blue;"></td></tr>
      </tbody>
    `;

    flexWrapper.appendChild(scheduleTable);

    // Mutăm butonul Salveaza jos lângă Trimite atacul
    const submitBtn = form.querySelector("#troop_confirm_submit");
    if (submitBtn && !document.getElementById("sa-save")) {
      const saveBtn = document.createElement("button");
      saveBtn.id = "sa-save";
      saveBtn.className = "btn";
      saveBtn.type = "button";
      saveBtn.textContent = "Salveaza";

      submitBtn.insertAdjacentElement("afterend", saveBtn);
    }

    let timeout, interval;

    const getServerTime = () => Math.round(Timing.getCurrentServerTime());
    const getTravelTime = () => 1000 * document.querySelector("#command-data-form .relative_time").dataset.duration;

    const getDateInput = () => {
      const d = new Date(document.querySelector('input[name="sa-d"]').value);
      d.setHours(document.querySelector('input[name="sa-t-h"]').value);
      d.setMinutes(document.querySelector('input[name="sa-t-m"]').value);
      d.setSeconds(document.querySelector('input[name="sa-t-s"]').value);
      d.setMilliseconds(document.querySelector('input[name="sa-t-ms"]').value);
      return d;
    };

    const isArrivalMode = () => document.querySelector('input[name="sa-mod"]:checked').value === "arrival";

    const formatTime = (d) =>
      d instanceof Date
        ? window.Format.date(d / 1000, true) + ":" + window.Format.padLead(d.getUTCMilliseconds(), 3)
        : 0;

    const setLaunchTime = (t) => (document.getElementById("sa-launch").textContent = formatTime(t));
    const setArrivalTime = (t) => (document.getElementById("sa-arrival").textContent = formatTime(t));
    const setReturnTime = (t) => (document.getElementById("sa-return").textContent = formatTime(t));

    const formatCountdown = (ms) => {
      const h = Math.floor(ms / 3600000),
        m = Math.floor((ms % 3600000) / 60000),
        s = Math.floor((ms % 60000) / 1000),
        msRem = ms % 1000;
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(msRem).padStart(3, "0")}`;
    };

    const playBeep = () => {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)(),
          osc = ctx.createOscillator(),
          gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2);
        osc.stop(ctx.currentTime + 0.2);
      } catch (e) {
        console.warn("Beep not supported", e);
      }
    };

    const calculate = () => {
      const form = document.getElementById("command-data-form");
      if (!form) {
        alert("Form with id 'command-data-form' not found!");
        return;
      }

      if (form.reportValidity()) {
        const inputDate = getDateInput(),
          duration = getTravelTime();

        const launchTime = isArrivalMode()
          ? new Date(inputDate.getTime() - duration)
          : inputDate;
        const arrivalTime = isArrivalMode()
          ? inputDate
          : new Date(inputDate.getTime() + duration);

        const returnTime = new Date(1000 * Math.floor(arrivalTime.getTime() / 1000) + duration);

        clearTimeout(timeout);
        clearInterval(interval);

        let delay = launchTime.getTime() - getServerTime();
        if (delay < 0) delay = 0;

        setLaunchTime(launchTime);
        setArrivalTime(arrivalTime);
        setReturnTime(returnTime);

        interval = setInterval(() => {
          const remaining = launchTime.getTime() - getServerTime();
          if (remaining <= 0) {
            clearInterval(interval);
            document.getElementById("sa-countdown").textContent = "00:00:00.000";
          } else {
            document.getElementById("sa-countdown").textContent = formatCountdown(remaining);
          }
        }, 50);

        timeout = setTimeout(() => {
          playBeep();
          form.submit();
          clearInterval(interval);
        }, delay);
      }
    };

    document.getElementById("sa-save").addEventListener("click", calculate);
  }
});
