(function () {
  function ScheduleAttack() {
    let timeout, interval;

    const init = () => {
      const form = $("#command-data-form");

      // Wrap form in flex container if not already wrapped
      if (!form.parent().attr("id") || form.parent().attr("id") !== "container") {
        form.wrap('<div id="container" style="display:flex; align-items:flex-start; gap: 20px;"></div>');
      }

      const container = form.parent(); // #container div

      // Add Planner table on the LEFT side of the form
      if ($("#planner-table").length === 0) {
        const plannerTable = $(`
          <table id="planner-table" class="vis" style="width: 400px; border: 1px solid #ccc; background-color: #e9f7ef;">
            <thead>
              <tr><th colspan="2">Planner</th></tr>
            </thead>
            <tbody>
              <tr><td>Notă:</td><td><textarea rows="4" style="width: 100%; resize: vertical;"></textarea></td></tr>
              <tr><td>Prioritate:</td><td>
                <select style="width: 100%;">
                  <option>Scăzută</option>
                  <option>Medie</option>
                  <option>Ridicată</option>
                </select>
              </td></tr>
              <tr><td colspan="2"><button class="btn" type="button">Salvează Plan</button></td></tr>
            </tbody>
          </table>
        `);
        container.prepend(plannerTable); // Insert inside container, before the form
      }

      // Add Schedule table on the RIGHT side of the form
      if ($("#schedule-table").length === 0) {
        const scheduleTable = $(`
          <table id="schedule-table" class="vis" style="width: 400px; border: 1px solid #ccc; background-color: #f9f9f9;">
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
          </table>
        `);
        container.append(scheduleTable); // Insert inside container, after the form

        // Default date setup
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const yyyy = tomorrow.getFullYear();
        const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
        const dd = String(tomorrow.getDate()).padStart(2, '0');
        $('input[name="sa-d"]').val(`${yyyy}-${mm}-${dd}`);

        $('input[name="sa-t-h"], input[name="sa-t-m"], input[name="sa-t-s"], input[name="sa-t-ms"]').val("");

        $("#sa-save").click(() => calculate());
      }
    };

    const getServerTime = () => Math.round(Timing.getCurrentServerTime());

    const getTravelTime = () => 1000 * $("#command-data-form").find(".relative_time").data("duration");

    const getDateInput = () => {
      const d = new Date($('input[name="sa-d"]').val());
      d.setHours($('input[name="sa-t-h"]').val());
      d.setMinutes($('input[name="sa-t-m"]').val());
      d.setSeconds($('input[name="sa-t-s"]').val());
      d.setMilliseconds($('input[name="sa-t-ms"]').val());
      return d;
    };

    const isArrivalMode = () => $('input[name="sa-mod"]:checked').val() === "arrival";

    const formatTime = (d) =>
      d instanceof Date
        ? window.Format.date(d / 1000, true) + ":" + window.Format.padLead(d.getUTCMilliseconds(), 3)
        : 0;

    const setLaunchTime = (t) => $("#sa-launch").text(formatTime(t));
    const setArrivalTime = (t) => $("#sa-arrival").text(formatTime(t));
    const setReturnTime = (t) => $("#sa-return").text(formatTime(t));

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
      if ($("#command-data-form")[0].reportValidity()) {
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
            $("#sa-countdown").text("00:00:00.000");
          } else {
            $("#sa-countdown").text(formatCountdown(remaining));
          }
        }, 50);

        timeout = setTimeout(() => {
          playBeep();
          HTMLFormElement.prototype.submit.call(document.getElementById("command-data-form"));
          clearInterval(interval);
        }, delay);
      }
    };

    if ($("#command-data-form").length === 0) {
      alert("Trebuie sa fii pe pagina de confirmare a comenzii!");
    } else {
      init();
    }
  }

  window.ScheduleAttack = new ScheduleAttack();
})();
