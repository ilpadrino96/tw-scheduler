(() => {
  const form = document.getElementById("command-data-form");
  if (!form) {
    alert("Trebuie să fii pe pagina de confirmare a comenzii!");
    return;
  }

  // Insert schedule table only once
  if (!document.getElementById("schedule-table")) {
    // Prepare layout wrapper
    const firstDiv = form.querySelector("div");
    const flexWrapper = document.createElement("div");
    flexWrapper.id = "flex-wrapper";
    flexWrapper.style.display = "flex";
    flexWrapper.style.flexDirection = "row";
    flexWrapper.style.alignItems = "flex-start";
    flexWrapper.style.gap = "20px";
    flexWrapper.style.marginBottom = "20px";

    form.insertBefore(flexWrapper, firstDiv);
    flexWrapper.appendChild(firstDiv);

    // Create schedule table
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
        <tr><td>Întoarcere:</td><td id="sa-return"></td></tr>
        <tr><td>Countdown:</td><td id="sa-countdown" style="font-weight:bold; color:blue;"></td></tr>
        <tr><td colspan="2" align="center">Pe ei cocenii mei ! 🌽🌽🌽</td></tr>
      </tbody>
    `;
    flexWrapper.appendChild(scheduleTable);
  }

  // Find or create the save button in the form (at bottom)
  let saveBtn = document.getElementById("sa-save");
  if (!saveBtn) {
    saveBtn = document.createElement("button");
    saveBtn.id = "sa-save";
    saveBtn.className = "btn";
    saveBtn.type = "button";
    saveBtn.textContent = "👍 Salveaza Programarea";
    form.appendChild(saveBtn);
  }

  // Utility functions
  const getServerTime = () => Math.round(Timing.getCurrentServerTime());
  const getTravelTime = () => 1000 * form.querySelector(".relative_time").dataset.duration;

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
      : "";

  const setLaunchTime = (t) => {
    const el = document.getElementById("sa-launch");
    if (el) el.textContent = formatTime(t);
  };

  const setArrivalTime = (t) => {
    const el = document.getElementById("sa-arrival");
    if (el) el.textContent = formatTime(t);
  };

  const setReturnTime = (t) => {
    const el = document.getElementById("sa-return");
    if (el) el.textContent = formatTime(t);
  };

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

  let timeout, interval;

  const calculateAndSubmit = () => {
    if (!form.reportValidity()) return;

    const inputDate = getDateInput();
    const travelDuration = getTravelTime();

    const launchTime = isArrivalMode()
      ? new Date(inputDate.getTime() - travelDuration)
      : inputDate;

    const arrivalTime = isArrivalMode()
      ? inputDate
      : new Date(inputDate.getTime() + travelDuration);

    const returnTime = new Date(1000 * Math.floor(arrivalTime.getTime() / 1000) + travelDuration);

    clearTimeout(timeout);
    clearInterval(interval);

    let delay = launchTime.getTime() - getServerTime();
    if (delay < 0) delay = 0;

    setLaunchTime(launchTime);
    setArrivalTime(arrivalTime);
    setReturnTime(returnTime);

    interval = setInterval(() => {
      const remaining = launchTime.getTime() - getServerTime();
      const countdownEl = document.getElementById("sa-countdown");
      if (remaining <= 0) {
        clearInterval(interval);
        if (countdownEl) countdownEl.textContent = "00:00:00.000";
      } else {
        if (countdownEl) countdownEl.textContent = formatCountdown(remaining);
      }
    }, 50);

    timeout = setTimeout(() => {
      playBeep();
      HTMLFormElement.prototype.submit.call(form);
      clearInterval(interval);
    }, delay);
  };

  saveBtn.addEventListener("click", calculateAndSubmit);
})();
