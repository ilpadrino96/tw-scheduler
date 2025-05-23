(function () {
  function ScheduleAttack() {
    let timeout, interval;

    const init = () => {
      const container = document.getElementById("content_value");
      if (!container) {
        alert("Element with id 'content_value' not found!");
        return;
      }

      // Make container a flex container for side-by-side layout
      container.style.display = "flex";
      container.style.gap = "20px";
      container.style.alignItems = "flex-start";

      // Find the existing div (command table container)
      const existingDiv = container.querySelector("div");
      if (!existingDiv) {
        alert("Expected div inside #content_value not found!");
        return;
      }

      // Avoid adding schedule table multiple times
      if (!document.getElementById("schedule-table")) {
        // Create wrapper div for your schedule table
        const scheduleDiv = document.createElement("div");

        // Create table element
        const scheduleTable = document.createElement("table");
        scheduleTable.id = "schedule-table";
        scheduleTable.className = "vis";
        scheduleTable.style.width = "400px";
        scheduleTable.style.border = "1px solid #ccc";
        scheduleTable.style.backgroundColor = "#f9f9f9";

        scheduleTable.innerHTML = `
          <thead>
            <tr><th colspan="2">Programează Atacul</th></tr>
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
            <tr>
              <td colspan="2">
                <button id="sa-save" class="btn" type="button">Salveaza</button>
                <span class="float_right" style="position: absolute; right: 5px; padding: 3px">🌽</span>
              </td>
            </tr>
          </tbody>
        `;

        scheduleDiv.appendChild(scheduleTable);
        existingDiv.after(scheduleDiv);

        // Clear time inputs initially
        ["sa-t-h", "sa-t-m", "sa-t-s", "sa-t-ms"].forEach(name => {
          const input = scheduleTable.querySelector(`input[name="${name}"]`);
          if (input) input.value = "";
        });

        // Add event listener to the save button
        const saveButton = scheduleTable.querySelector("#sa-save");
        if (saveButton) {
          saveButton.addEventListener("click", calculate);
        }
      }
    };

    // Your existing utility functions here (getServerTime, getTravelTime, etc.)
    const getServerTime = () => Math.round(Timing.getCurrentServerTime());

    const getTravelTime = () => 1000 * document.querySelector("#command-data-form .relative_time").dataset.duration;

    const getDateInput = () => {
      const dateInput = document.querySelector('input[name="sa-d"]');
      const hInput = document.querySelector('input[name="sa-t-h"]');
      const mInput = document.querySelector('input[name="sa-t-m"]');
      const sInput = document.querySelector('input[name="sa-t-s"]');
      const msInput = document.querySelector('input[name="sa-t-ms"]');

      if (!dateInput) return null;

      const d = new Date(dateInput.value);
      if (hInput) d.setHours(hInput.value || 0);
      if (mInput) d.setMinutes(mInput.value || 0);
      if (sInput) d.setSeconds(sInput.value || 0);
      if (msInput) d.setMilliseconds(msInput.value || 0);

      return d;
    };

    const isArrivalMode = () => {
      const radios = document.getElementsByName("sa-mod");
      for (const r of radios) {
        if (r.checked) return r.value === "arrival";
      }
      return true; // default fallback
    };

    const formatTime = (d) => {
      if (!(d instanceof Date)) return 0;
      return window.Format.date(d / 1000, true) + ":" + window.Format.padLead(d.getUTCMilliseconds(), 3);
    };

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
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      const msRem = ms % 1000;
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(msRem).padStart(3, "0")}`;
    };

    const playBeep = () => {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
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
      if (!form) return;

      if (!form.reportValidity()) return;

      const inputDate = getDateInput();
      if (!inputDate) return;

      const duration = getTravelTime();

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
          const countdownEl = document.getElementById("sa-countdown");
          if (countdownEl) countdownEl.textContent = "00:00:00.000";
        } else {
          const countdownEl = document.getElementById("sa-countdown");
          if (countdownEl) countdownEl.textContent = formatCountdown(remaining);
        }
      }, 50);

      timeout = setTimeout(() => {
        playBeep();
        form.submit();
        clearInterval(interval);
      }, delay);
    };

    if (!document.getElementById("command-data-form")) {
      alert("Trebuie sa fii pe pagina de confirmare a comenzii!");
    } else {
      init();
    }
  }

  window.ScheduleAttack = new ScheduleAttack();
})();
