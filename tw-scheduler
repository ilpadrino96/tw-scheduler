(function() {
  function ScheduleAttack() {
    let timeout, interval;

    const init = () => {
      const confirmBtn = $("#troop_confirm_go"),
        arrivalTime = $("#date_arrival"),
        form = $("#command-data-form"),
        infoSpan = $('<span class="float_right" style="position: absolute; right: 5px; padding: 3px">🌽🌽🌽</span>');

      // Adjust table width
      arrivalTime.parents("table:first").attr("width", 500);

      // Insert scheduling UI after arrivalTime's parent
      arrivalTime.parent().after(
        '<tr><td>Programeaza:</td><td style="position: relative">' +
          '<table><tbody>' +
          '<tr><td>Mod:</td><td>' +
          '<input name="sa-mod" type="radio" value="arrival" checked>Soseste la ' +
          '<input name="sa-mod" type="radio" value="launch"> Lanseaza la' +
          '</td></tr>' +
          '<tr><td>Data:</td><td><input name="sa-d" type="date" required></td></tr>' +
          '<tr><td>Ora:</td><td>' +
          '<input name="sa-t-h" type="number" min="0" max="23" style="width:40px" required>: ' +
          '<input name="sa-t-m" type="number" min="0" max="59" style="width:40px" required>: ' +
          '<input name="sa-t-s" type="number" min="0" max="59" style="width:40px" required>: ' +
          '<input name="sa-t-ms" type="number" min="0" max="999" style="width:40px" required>' +
          '</td></tr>' +
          '<tr><td>Lansare:</td><td id="sa-launch" style="color:green; font-weight:bold;"></td></tr>' +
          '<tr><td>Sosire:</td><td id="sa-arrival"></td></tr>' +
          '<tr><td>Intoarcere:</td><td id="sa-return"></td></tr>' +
          '<tr><td>Countdown:</td><td id="sa-countdown" style="font-weight:bold; color:blue;"></td></tr>' +
          '<tr><td><button type="button" id="sa-save" class="btn float_left">Salveaza</button>' +
          infoSpan[0].outerHTML +
          '</td></tr>' +
          '</tbody></table>' +
          '</td></tr>'
      );

      // Set event handler on save button
      $("#sa-save").click(() => calculate());

      // Clear inputs
      $('input[name="sa-d"], input[name="sa-t-h"], input[name="sa-t-m"], input[name="sa-t-s"], input[name="sa-t-ms"]').val("");
    };

    const getServerTime = () => Math.round(Timing.getCurrentServerTime());

    const getTravelTime = () =>
      1000 * $("#command-data-form").find(".relative_time").data("duration");

    const getDateInput = () => {
      let d = new Date($('input[name="sa-d"]').val());
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
      let h = Math.floor(ms / 3600000),
        m = Math.floor((ms % 3600000) / 60000),
        s = Math.floor((ms % 60000) / 1000),
        msRem = ms % 1000;
      return (
        `${String(h).padStart(2, "0")}:` +
        `${String(m).padStart(2, "0")}:` +
        `${String(s).padStart(2, "0")}.` +
        `${String(msRem).padStart(3, "0")}`
      );
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

        // Calculate launch and arrival depending on mode
        const launchTime = isArrivalMode()
          ? new Date(inputDate.getTime() - duration)
          : inputDate;
        const arrivalTime = isArrivalMode()
          ? inputDate
          : new Date(inputDate.getTime() + duration);

        const returnTime = new Date(
          1000 * Math.floor(arrivalTime.getTime() / 1000) + duration
        );

        clearTimeout(timeout);
        clearInterval(interval);

        let delay = launchTime.getTime() - getServerTime();
        if (delay < 0) delay = 0;

        setLaunchTime(launchTime);
        setArrivalTime(arrivalTime);
        setReturnTime(returnTime);

        interval = setInterval(() => {
          let remaining = launchTime.getTime() - getServerTime();
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

    // Check if we're on the right page
    if ($("#command-data-form").length === 0) {
      alert("Trebuie sa fii pe pagina de confirmare a comenzii!");
    } else {
      init();
    }
  }

  window.ScheduleAttack = new ScheduleAttack();
})();
