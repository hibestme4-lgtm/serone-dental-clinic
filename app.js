(() => {
  const header = document.querySelector('.site-header');
  const logo = header.querySelector('img');
  const sheet = document.querySelector('#consult-sheet');
  const form = document.querySelector('#consult-form');

  // 상태가 바뀔 때만 로고를 교체 — 스크롤 이벤트마다 src를 다시 넣지 않도록
  new Image().src = 'assets/images/hd_logo_on.png';
  let headerScrolled = null;
  const onScroll = () => {
    const scrolled = window.scrollY > 36;
    if (scrolled === headerScrolled) return;
    headerScrolled = scrolled;
    header.classList.toggle('is-scrolled', scrolled);
    logo.src = scrolled ? 'assets/images/hd_logo_on.png' : 'assets/images/hd_logo.png';
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: .12 });
  // data-reveal-late: 화면 위쪽 70% 안으로 충분히 올라왔을 때 시작 (긴 문장 효과가 미리 끝나지 않도록)
  const lateRevealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      lateRevealObserver.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -30% 0px' });
  document.querySelectorAll('.reveal').forEach(el => (el.hasAttribute('data-reveal-late') ? lateRevealObserver : revealObserver).observe(el));

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const legacyTimeline = document.querySelector('.legacy-timeline');
  if (legacyTimeline && !reduceMotion) {
    let legacyTicking = false;
    const updateLegacyProgress = () => {
      const rect = legacyTimeline.getBoundingClientRect();
      const start = window.innerHeight * .78;
      const travel = rect.height + window.innerHeight * .38;
      const progress = Math.max(0, Math.min(1, (start - rect.top) / travel));
      legacyTimeline.style.setProperty('--timeline-progress', progress.toFixed(3));
      legacyTicking = false;
    };
    const requestLegacyUpdate = () => {
      if (legacyTicking) return;
      legacyTicking = true;
      requestAnimationFrame(updateLegacyProgress);
    };
    window.addEventListener('scroll', requestLegacyUpdate, { passive: true });
    window.addEventListener('resize', requestLegacyUpdate);
    updateLegacyProgress();
  }
  const processTimeline = document.querySelector('.process-timeline');
  if (processTimeline) {
    const processSteps = [...processTimeline.querySelectorAll('.process-step')];
    if (reduceMotion) {
      processSteps.forEach(step => step.classList.add('is-visible'));
    } else {
      // 여러 단계가 한꺼번에 화면에 들어와도 위에서부터 하나씩: 선이 다음 점까지 내려간 뒤 그 단계가 나타남
      const lineDuration = 240;
      const stepGap = 360;
      let shownCount = 0;
      let targetCount = 0;
      let running = false;
      const showNext = () => {
        if (shownCount >= targetCount) { running = false; return; }
        running = true;
        const index = shownCount++;
        const lineWait = index ? lineDuration : 0;
        processTimeline.style.setProperty('--process-progress', (index / (processSteps.length - 1)).toFixed(3));
        setTimeout(() => processSteps[index].classList.add('is-visible'), lineWait);
        setTimeout(showNext, lineWait + stepGap);
      };
      const processObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          targetCount = Math.max(targetCount, processSteps.indexOf(entry.target) + 1);
          processObserver.unobserve(entry.target);
        });
        if (!running) showNext();
      }, { threshold: .15, rootMargin: '0px 0px -18% 0px' });
      processSteps.forEach(step => processObserver.observe(step));
    }
  }
  const countObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      countObserver.unobserve(entry.target);
      const el = entry.target;
      const target = Number(el.dataset.countTo);
      const suffix = el.dataset.countSuffix || '';
      const duration = 1400;
      const start = performance.now();
      const tick = now => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = `${Math.round(target * eased)}${suffix}`;
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  // 숫자 전체가 화면 위쪽 55% 안으로 올라왔을 때 시작 — 화면 아래에 막 보일 때 미리 끝나버리지 않도록
  }, { threshold: 1, rootMargin: '0px 0px -45% 0px' });
  // 웹폰트가 적용된 뒤의 최종 폭으로 고정해야 자릿수가 바뀌어도 옆 글자가 밀리지 않음
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => {
    document.querySelectorAll('[data-count-to]').forEach(el => {
      if (reduceMotion) return;
      el.setAttribute('aria-label', el.textContent);
      el.style.display = 'inline-block';
      el.style.minWidth = `${el.getBoundingClientRect().width}px`;
      el.textContent = `0${el.dataset.countSuffix || ''}`;
      countObserver.observe(el);
    });
  });

  // 배경 연도: 주행거리계처럼 끝 두 자리가 굴러가며 2016 → 2026으로 이어짐
  document.querySelectorAll('[data-year-from]').forEach(el => {
    const from = Number(el.dataset.yearFrom);
    const to = Number(el.dataset.yearTo);
    const section = el.closest('section');
    if (reduceMotion) {
      el.textContent = String(to);
      el.classList.add('is-visible', 'is-final');
      return;
    }

    // 앞 두 자리는 고정, 십의 자리·일의 자리는 숫자 띠를 세로로 이어 붙여 움직임
    const prefix = String(from).slice(0, 2);
    const fromRest = from % 100;
    const toRest = to % 100;
    const tensDigits = [];
    for (let t = Math.floor(fromRest / 10); t <= Math.floor(toRest / 10); t++) tensDigits.push(t);
    const onesDigits = [];
    for (let v = fromRest; v <= toRest; v++) onesDigits.push(v % 10);
    const strip = digits => `<span class="year-col"><span class="year-strip">${digits.map(d => `<span>${d}</span>`).join('')}</span></span>`;
    el.innerHTML = `${prefix}${strip(tensDigits)}${strip(onesDigits)}`;
    const [tensStrip, onesStrip] = el.querySelectorAll('.year-strip');

    const render = value => {
      const passed = value - fromRest;
      onesStrip.style.transform = `translateY(${-passed}em)`;
      // 십의 자리는 일의 자리가 9 → 0으로 넘어가는 그 한 칸 동안에만 함께 굴러감
      const tensBase = Math.floor(fromRest / 10);
      const tensMoved = Math.floor(value / 10) - tensBase + Math.max(0, (value % 10) - 9);
      tensStrip.style.transform = `translateY(${-Math.min(tensDigits.length - 1, tensMoved)}em)`;
    };
    render(fromRest);

    const easeInOut = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const yearObserver = new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting) return;
      yearObserver.disconnect();
      el.classList.add('is-visible');
      const duration = 2600;
      const start = performance.now() + 500;
      const tick = now => {
        const t = Math.max(0, Math.min(1, (now - start) / duration));
        render(fromRest + (toRest - fromRest) * easeInOut(t));
        if (t < 1) requestAnimationFrame(tick);
        else el.classList.add('is-final');
      };
      requestAnimationFrame(tick);
    }, { rootMargin: '0px 0px -25% 0px' });
    yearObserver.observe(el);

    // 배경 숫자는 스크롤보다 느리게 움직여 깊이감을 줌 (섹션이 아래에 있을 땐 조금 낮게, 지나가면 조금 높게)
    let parallaxTicking = false;
    const updateParallax = () => {
      parallaxTicking = false;
      const top = section.getBoundingClientRect().top;
      if (top > window.innerHeight || top < -window.innerHeight) return;
      const offset = Math.max(-70, Math.min(70, (top - window.innerHeight * .3) * .22));
      el.style.translate = `0 ${offset.toFixed(1)}px`;
    };
    window.addEventListener('scroll', () => {
      if (parallaxTicking) return;
      parallaxTicking = true;
      requestAnimationFrame(updateParallax);
    }, { passive: true });
    updateParallax();
  });

  const heroVideo = document.querySelector('.hero-video');
  if (heroVideo && reduceMotion) {
    heroVideo.removeAttribute('autoplay');
    heroVideo.pause();
  }
  document.querySelectorAll('[data-scroll-fill]').forEach(heading => {
    if (reduceMotion) return;
    heading.setAttribute('aria-label', heading.textContent.trim());
    // 단어 단위로 묶어야 글자를 쪼개도 줄바꿈이 단어 중간에서 일어나지 않음
    const textNodes = [];
    const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) textNodes.push(walker.currentNode);
    textNodes.forEach(node => {
      const fragment = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach(part => {
        if (!part) return;
        if (/^\s+$/.test(part)) { fragment.append(part); return; }
        const word = document.createElement('span');
        word.className = 'fill-word';
        word.setAttribute('aria-hidden', 'true');
        [...part].forEach(char => {
          const span = document.createElement('span');
          span.className = 'fill-char';
          span.textContent = char;
          word.append(span);
        });
        fragment.append(word);
      });
      node.replaceWith(fragment);
    });

    const chars = [...heading.querySelectorAll('.fill-char')];
    let ticking = false;
    let lastProgress = -1;
    // 제목 윗변이 화면 85% 지점에 오면 채우기 시작, 40% 지점에서 완료
    const update = () => {
      ticking = false;
      const top = heading.getBoundingClientRect().top;
      // data-fill-start / data-fill-end로 문장마다 시작·완료 지점을 바꿀 수 있음
      const start = window.innerHeight * Number(heading.dataset.fillStart || .85);
      const end = window.innerHeight * Number(heading.dataset.fillEnd || .4);
      const progress = Math.max(0, Math.min(1, (start - top) / (start - end)));
      // 화면 밖에서 0이나 1에 머물러 있을 때는 글자마다 스타일을 다시 쓰지 않음
      if (progress === lastProgress) return;
      lastProgress = progress;
      const filled = progress * chars.length;
      chars.forEach((char, index) => {
        char.style.setProperty('--f', Math.max(0, Math.min(1, filled - index)).toFixed(3));
      });
    };
    const requestUpdate = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);
    update();
  });

  const riseObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        riseObserver.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -20% 0px' });
  document.querySelectorAll('[data-rise]').forEach(el => {
    if (reduceMotion) return;
    el.classList.add('is-rise-ready');
    riseObserver.observe(el);
  });

  const careVideos = [...document.querySelectorAll('.care-card video')];
  const stopVideo = video => {
    video.pause();
    video.currentTime = 0;
  };

  document.querySelectorAll('.care-card').forEach(card => {
    const video = card.querySelector('video');
    let hovering = false;

    const moveSpotlight = event => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--spot-x', `${event.clientX - rect.left}px`);
      card.style.setProperty('--spot-y', `${event.clientY - rect.top}px`);
      card.classList.add('is-spotlit');
    };

    const playVideo = () => {
      if (!video || reduceMotion) return;
      video.play().catch(() => {});
    };

    if (video) {
      // 마우스는 올려둔 동안 반복, 터치는 한 번 재생 후 원래 모습으로
      video.addEventListener('ended', () => {
        if (hovering) video.play().catch(() => {});
        else video.currentTime = 0;
      });
    }

    card.addEventListener('pointerenter', event => {
      moveSpotlight(event);
      if (event.pointerType === 'mouse') {
        hovering = true;
        playVideo();
      }
    });
    card.addEventListener('pointermove', moveSpotlight);
    card.addEventListener('pointerdown', event => {
      moveSpotlight(event);
      if (event.pointerType !== 'mouse' && video) {
        careVideos.filter(other => other !== video).forEach(stopVideo);
        video.currentTime = 0;
        playVideo();
      }
    });
    card.addEventListener('pointerleave', event => {
      card.classList.remove('is-spotlit');
      if (event.pointerType === 'mouse' && video) {
        hovering = false;
        stopVideo(video);
      }
    });
    card.addEventListener('pointerup', event => {
      if (event.pointerType !== 'mouse') {
        window.setTimeout(() => card.classList.remove('is-spotlit'), 420);
      }
    });
  });

  // 자가 체크 섹션은 지금 숨겨져 있음 — HTML에서 지워도 아래 기능들이 멈추지 않도록 있을 때만 실행
  const checker = document.querySelector('[data-checker]');
  if (checker) initChecker(checker);

  function initChecker(checker) {
    const steps = [...checker.querySelectorAll('.check-step')];
    const result = checker.querySelector('.check-result');
    const progress = checker.querySelector('.check-progress');
    const progressSteps = [...checker.querySelectorAll('.progress-steps i')];
    const stepNumber = checker.querySelector('[data-step-number]');
    const answers = { state: '', concerns: [], audience: '' };

    function updateProgress(number) {
      progress.style.setProperty('--tooth-fill', `${number * 33.333}%`);
      progress.setAttribute('aria-label', `자가 체크 진행률 3단계 중 ${number}단계`);
      progressSteps.forEach((step, index) => step.classList.toggle('is-active', index < number));
      progress.classList.remove('is-updating');
      void progress.offsetWidth;
      progress.classList.add('is-updating');
    }

    function showStep(number) {
      steps.forEach(step => step.classList.toggle('is-active', Number(step.dataset.step) === number));
      result.classList.remove('is-active');
      stepNumber.textContent = String(number);
      updateProgress(number);
    }

    steps[0].querySelectorAll('button[data-value]').forEach(button => {
      button.addEventListener('click', () => {
        answers.state = button.dataset.value;
        steps[0].querySelectorAll('button').forEach(b => b.classList.toggle('is-selected', b === button));
        setTimeout(() => showStep(2), 180);
      });
    });

    steps[1].querySelectorAll('button[data-value]').forEach(button => {
      button.addEventListener('click', () => {
        button.classList.toggle('is-selected');
        answers.concerns = [...steps[1].querySelectorAll('.is-selected')].map(b => b.dataset.value);
      });
    });
    steps[1].querySelector('.check-next').addEventListener('click', () => showStep(3));

    steps[2].querySelectorAll('button[data-value]').forEach(button => {
      button.addEventListener('click', () => {
        answers.audience = button.dataset.value;
        steps[2].querySelectorAll('button').forEach(b => b.classList.toggle('is-selected', b === button));
        setTimeout(showResult, 180);
      });
    });

    function showResult() {
      let title = '기본 임플란트 상담';
      let copy = '현재 치아와 주변 잇몸 상태를 확인하는 상담이 필요합니다.';
      let category = '처음 임플란트';

      if (answers.state === 'existing' || answers.concerns.includes('loose')) {
        title = '기존 임플란트 점검 상담';
        copy = '임플란트 주변 잇몸과 보철물, 씹는 상태를 먼저 점검해 보세요.';
        category = '기존 임플란트 점검';
      } else if (answers.audience === 'over65' || answers.concerns.includes('insurance')) {
        title = '65세 이상 건강보험 상담';
        copy = '건강보험 적용 대상과 남아 있는 적용 개수를 확인해 보세요.';
        category = '65세 이상 건강보험';
      } else if (answers.audience === 'guardian') {
        title = '보호자 동반 임플란트 상담';
        copy = '복용약과 기저질환, 치료과정을 보호자분과 함께 확인해 보세요.';
        category = '보호자 상담';
      } else if (answers.state === 'multiple' || answers.concerns.includes('bone')) {
        title = '정밀 임플란트 상담';
        copy = '잇몸뼈와 신경 위치를 확인하고 골이식 여부를 포함한 계획이 필요할 수 있습니다.';
        category = answers.state === 'multiple' ? '전체 임플란트' : '뼈이식';
      }

      steps.forEach(step => step.classList.remove('is-active'));
      result.classList.add('is-active');
      result.querySelector('[data-result-title]').textContent = title;
      result.querySelector('[data-result-copy]').textContent = copy;
      result.querySelector('[data-open-consult]').dataset.category = category;
      stepNumber.textContent = '3';
      updateProgress(3);
    }

    checker.querySelector('[data-restart-check]').addEventListener('click', () => {
      answers.state = ''; answers.concerns = []; answers.audience = '';
      checker.querySelectorAll('.is-selected').forEach(el => el.classList.remove('is-selected'));
      showStep(1);
    });
  }

  document.querySelectorAll('[data-horizontal-types]').forEach(section => {
    const story = section.querySelector('[data-type-story]');
    const track = section.querySelector('[data-type-track]');
    const cards = [...section.querySelectorAll('.type-card')];
    const progressBar = section.querySelector('[data-type-progress]');
    if (!story || !track || cards.length < 2) return;

    let activeIndex = -1;
    const setActive = index => {
      if (index === activeIndex) return;
      activeIndex = index;
      cards.forEach((card, cardIndex) => {
        const active = cardIndex === index;
        card.classList.toggle('is-active', active);
        if (active) card.setAttribute('aria-current', 'true');
        else card.removeAttribute('aria-current');
      });
    };

    const syncIndicators = () => {
      const maxScroll = Math.max(1, track.scrollWidth - track.clientWidth);
      const horizontalProgress = Math.max(0, Math.min(1, track.scrollLeft / maxScroll));
      const viewportCenter = track.scrollLeft + track.clientWidth / 2;
      let nearestIndex = 0;
      let nearestDistance = Infinity;
      cards.forEach((card, index) => {
        const distance = Math.abs(card.offsetLeft + card.offsetWidth / 2 - viewportCenter);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = index;
        }
      });
      setActive(nearestIndex);
      const filled = (1 + horizontalProgress * (cards.length - 1)) / cards.length;
      progressBar.style.transform = `scaleX(${filled})`;
    };

    if (reduceMotion) {
      track.addEventListener('scroll', syncIndicators, { passive: true });
      syncIndicators();
      return;
    }

    section.classList.add('is-horizontal-ready');
    story.style.height = `${100 + (cards.length - 1) * 62}svh`;
    let animationFrame = 0;
    let currentLeft = track.scrollLeft;

    // 카드가 화면 가운데 오는 가로 위치 — 이 지점 근처에서 잠깐 머물도록 사이 구간에 이징을 줌
    // 매 프레임 레이아웃을 다시 읽지 않도록 한 번 재 두고, 화면 크기가 바뀔 때만 다시 잼
    let stops = [];
    const measureStops = () => {
      const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
      stops = cards.map(card => Math.max(0, Math.min(maxScroll, card.offsetLeft + card.offsetWidth / 2 - track.clientWidth / 2)));
    };
    measureStops();
    const ease = t => t + ((t * t * (3 - 2 * t)) - t) * .7;

    const targetLeft = () => {
      const rect = story.getBoundingClientRect();
      const scrollRange = Math.max(1, story.offsetHeight - window.innerHeight);
      const progress = Math.max(0, Math.min(1, -rect.top / scrollRange));
      const position = progress * (stops.length - 1);
      const index = Math.min(stops.length - 2, Math.floor(position));
      return stops[index] + (stops[index + 1] - stops[index]) * ease(position - index);
    };

    // 카드 크기·투명도를 가운데와의 거리에 따라 연속으로 바꿔 툭 끊기는 느낌을 없앰
    // 처음·마지막 카드는 가운데까지 오지 못하므로 화면 중심이 아니라 멈춤 지점 기준으로 거리를 잼
    const styleCards = () => {
      let position = stops.length - 1;
      for (let i = 0; i < stops.length - 1; i++) {
        if (track.scrollLeft <= stops[i + 1]) {
          position = i + (track.scrollLeft - stops[i]) / Math.max(1, stops[i + 1] - stops[i]);
          break;
        }
      }
      cards.forEach((card, index) => {
        const distance = Math.min(1, Math.abs(index - position));
        card.style.opacity = (1 - distance * .58).toFixed(3);
        card.style.transform = `scale(${(1 - distance * .06).toFixed(4)})`;
      });
    };

    const updateHorizontalScroll = () => {
      const target = targetLeft();
      currentLeft += (target - currentLeft) * .14;
      if (Math.abs(target - currentLeft) < .5) currentLeft = target;
      track.scrollLeft = currentLeft;
      syncIndicators();
      styleCards();
      animationFrame = currentLeft === target ? 0 : requestAnimationFrame(updateHorizontalScroll);
    };

    const requestUpdate = () => {
      if (animationFrame) return;
      animationFrame = requestAnimationFrame(updateHorizontalScroll);
    };

    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', () => {
      measureStops();
      requestUpdate();
    }, { passive: true });
    requestUpdate();
  });

  document.querySelectorAll('[data-why-story]').forEach(story => {
    const steps = [...story.querySelectorAll('[data-story-step]')];
    const visuals = [...story.querySelectorAll('[data-story-visual]')];
    let activeIndex = 0;

    const activate = index => {
      if (index === activeIndex && steps[index].classList.contains('is-active')) return;
      activeIndex = index;
      steps.forEach((step, stepIndex) => step.classList.toggle('is-active', stepIndex === index));
      visuals.forEach((visual, visualIndex) => visual.classList.toggle('is-active', visualIndex === index));
    };

    // 제목이 화면 45% 지점을 지난 마지막 단계를 활성화 — 위·아래 어느 방향으로 스크롤해도 같은 결과
    let ticking = false;
    const update = () => {
      ticking = false;
      const anchor = window.innerHeight * .45;
      let index = 0;
      steps.forEach((step, stepIndex) => {
        if (step.querySelector('h3').getBoundingClientRect().top <= anchor) index = stepIndex;
      });
      activate(index);
    };
    const requestUpdate = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);
    update();
  });

  document.querySelectorAll('[data-implant-reveal]').forEach(widget => {
    const stage = widget.querySelector('.implant-stage');
    const hotspot = widget.querySelector('.implant-hotspot');
    const touchDevice = window.matchMedia('(hover: none)').matches;
    let hasRevealed = false;
    // 탭으로 옮긴 돋보기는 사용자가 다시 스크롤할 때까지 그 자리에 둠
    let pinnedAtScroll = null;
    let scrollTicking = false;

    const setSpotlight = event => {
      const rect = stage.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
      const y = Math.max(0, Math.min(rect.height, event.clientY - rect.top));
      stage.style.setProperty('--spot-x', `${x}px`);
      stage.style.setProperty('--spot-y', `${y}px`);
    };

    const reveal = event => {
      if (event) setSpotlight(event);
      stage.classList.add('is-revealing');
      hasRevealed = true;
    };

    hotspot.addEventListener('click', event => {
      event.stopPropagation();
      const rect = stage.getBoundingClientRect();
      reveal({ clientX: rect.left + rect.width * .5, clientY: rect.top + rect.height * .58 });
      pinnedAtScroll = window.scrollY;
    });

    if (!touchDevice) {
      stage.addEventListener('pointermove', event => {
        if (event.pointerType === 'mouse') reveal(event);
      });
      stage.addEventListener('pointerleave', event => {
        if (event.pointerType === 'mouse' && !hasRevealed) stage.classList.remove('is-revealing');
      });
      return;
    }

    // 모바일: 드래그는 스크롤과 충돌하므로, 스크롤에 맞춰 돋보기가 치아 → 잇몸 → 뼈 순으로 내려가게 함
    stage.addEventListener('click', event => {
      reveal(event);
      pinnedAtScroll = window.scrollY;
    });

    const followScroll = () => {
      scrollTicking = false;
      if (pinnedAtScroll !== null) {
        if (Math.abs(window.scrollY - pinnedAtScroll) < 60) return;
        pinnedAtScroll = null;
      }
      const rect = stage.getBoundingClientRect();
      const vh = window.innerHeight;
      // 사진 윗부분이 화면 70% 지점에 올 때 시작, 사진 아래가 화면 45% 지점에 올 때 끝
      const start = vh * .7;
      const end = vh * .45 - rect.height;
      const progress = (start - rect.top) / (start - end);
      if (progress < .08) {
        if (!hasRevealed) return;
        stage.classList.remove('is-revealing');
        hasRevealed = false;
        return;
      }
      const p = Math.min(1, progress);
      const ease = p * p * (3 - 2 * p);
      reveal({
        clientX: rect.left + rect.width * (.47 + ease * .06),
        clientY: rect.top + rect.height * (.4 + ease * .36)
      });
    };

    const requestFollow = () => {
      if (scrollTicking) return;
      scrollTicking = true;
      requestAnimationFrame(followScroll);
    };
    window.addEventListener('scroll', requestFollow, { passive: true });
    window.addEventListener('resize', requestFollow);
    followScroll();
  });

  const zoomViewer = document.querySelector('.zoom-viewer');
  if (zoomViewer) {
    const zoomImage = zoomViewer.querySelector('img');
    let zoomSource = null;
    let zoomBusy = false;

    // 원래 사진 자리에서 크게 커지는 것처럼 보이도록, 확대된 위치를 기준으로 작은 사진 위치까지의 변형을 계산
    const fromSourceTransform = () => {
      const from = zoomSource.querySelector('img').getBoundingClientRect();
      const to = zoomImage.getBoundingClientRect();
      return `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width}, ${from.height / to.height})`;
    };
    const zoomTiming = { duration: 420, easing: 'cubic-bezier(.22,.8,.26,1)' };

    const openZoom = async figure => {
      if (zoomBusy) return;
      zoomBusy = true;
      zoomSource = figure;
      const source = figure.querySelector('img');
      zoomImage.src = source.currentSrc || source.src;
      zoomImage.alt = source.alt;
      try { await zoomImage.decode(); } catch (error) { /* 이미 보이던 사진이라 그대로 진행 */ }
      zoomViewer.hidden = false;
      document.body.classList.add('is-locked');
      requestAnimationFrame(() => zoomViewer.classList.add('is-open'));
      if (!reduceMotion) await zoomImage.animate([{ transform: fromSourceTransform() }, { transform: 'none' }], zoomTiming).finished;
      zoomViewer.querySelector('.zoom-close').focus({ preventScroll: true });
      zoomBusy = false;
    };

    const closeZoom = async () => {
      if (zoomBusy || zoomViewer.hidden) return;
      zoomBusy = true;
      zoomViewer.classList.remove('is-open');
      if (!reduceMotion) await zoomImage.animate([{ transform: 'none' }, { transform: fromSourceTransform() }], zoomTiming).finished;
      zoomViewer.hidden = true;
      document.body.classList.remove('is-locked');
      zoomSource.focus({ preventScroll: true });
      zoomBusy = false;
    };

    document.querySelectorAll('[data-zoom]').forEach(figure => {
      const label = figure.querySelector('img').alt;
      figure.setAttribute('tabindex', '0');
      figure.setAttribute('role', 'button');
      figure.setAttribute('aria-label', `사진 크게 보기: ${label}`);
      figure.addEventListener('click', () => openZoom(figure));
      figure.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        openZoom(figure);
      });
    });
    // 확대된 화면은 어디를 눌러도 닫힘
    zoomViewer.addEventListener('click', closeZoom);
    document.addEventListener('keydown', event => { if (event.key === 'Escape') closeZoom(); });
  }

  function openConsult(category) {
    sheet.classList.add('is-open');
    sheet.setAttribute('aria-hidden', 'false');
    document.body.classList.add('is-locked');
    if (category) {
      const input = form.querySelector(`input[name="category"][value="${CSS.escape(category)}"]`);
      if (input) input.checked = true;
    }
    // 입력칸에 바로 포커스를 주면 모바일 키보드가 올라와 신청서를 가림 — 창 자체에 포커스
    sheet.querySelector('.sheet-panel').focus({ preventScroll: true });
  }

  const sheetTitle = sheet.querySelector('.sheet-title');
  const consultDone = sheet.querySelector('.consult-done');
  const consentModal = sheet.querySelector('.consent-modal');
  let consentField = '';

  function resetConsult() {
    form.reset();
    form.hidden = false;
    sheetTitle.hidden = false;
    consultDone.hidden = true;
    form.querySelector('.form-message').textContent = '';
  }

  function closeConsult() {
    sheet.classList.remove('is-open');
    sheet.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('is-locked');
    closeConsent();
    // 접수 완료 화면을 본 뒤 다시 열면 빈 신청서부터 시작
    if (!consultDone.hidden) resetConsult();
  }

  function openConsent(key) {
    const template = document.getElementById(`consent-${key}`);
    if (!template) return;
    consentField = template.dataset.field;
    consentModal.querySelector('#consent-title').textContent = template.dataset.title;
    const body = consentModal.querySelector('.consent-body');
    body.replaceChildren(template.content.cloneNode(true));
    body.scrollTop = 0;
    consentModal.hidden = false;
    consentModal.querySelector('[data-consent-agree]').focus();
  }

  function closeConsent() {
    if (consentModal.hidden) return;
    consentModal.hidden = true;
    const trigger = form.querySelector(`[data-consent-open="${consentField === 'agreeHealth' ? 'health' : 'privacy'}"]`);
    if (trigger && sheet.classList.contains('is-open')) trigger.focus();
  }

  document.addEventListener('click', event => {
    const opener = event.target.closest('[data-open-consult]');
    if (opener) openConsult(opener.dataset.category || '');
    if (event.target.closest('[data-close-consult]')) closeConsult();
    const consentOpener = event.target.closest('[data-consent-open]');
    if (consentOpener) openConsent(consentOpener.dataset.consentOpen);
    if (event.target.closest('[data-consent-close]') || event.target === consentModal) closeConsent();
    if (event.target.closest('[data-consent-agree]')) {
      form.elements[consentField].checked = true;
      closeConsent();
    }
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    if (!consentModal.hidden) closeConsent();
    else closeConsult();
  });

  const phoneInput = form.querySelector('input[name="phone"]');
  phoneInput.addEventListener('input', () => {
    const digits = phoneInput.value.replace(/\D/g, '').slice(0, 11);
    phoneInput.value = digits.length < 4 ? digits : digits.length < 8 ? `${digits.slice(0,3)}-${digits.slice(3)}` : `${digits.slice(0,3)}-${digits.slice(3,7)}-${digits.slice(7)}`;
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    const message = form.querySelector('.form-message');
    const name = form.elements.name.value.trim();
    const phone = form.elements.phone.value.replace(/\D/g, '');
    if (!name) { message.textContent = '환자 성함을 입력해 주세요.'; form.elements.name.focus(); return; }
    if (!/^0\d{8,10}$/.test(phone)) { message.textContent = '연락처를 정확히 입력해 주세요.'; phoneInput.focus(); return; }
    if (!form.elements.agreePrivacy.checked) { message.textContent = '개인정보 수집 및 이용에 동의해 주세요.'; return; }
    if (!form.elements.agreeHealth.checked) { message.textContent = '민감정보(건강정보) 처리에 동의해 주세요.'; return; }
    message.textContent = '';
    form.hidden = true;
    sheetTitle.hidden = true;
    consultDone.hidden = false;
    sheet.querySelector('.sheet-panel').scrollTop = 0;
    consultDone.querySelector('button').focus();
  });
})();
