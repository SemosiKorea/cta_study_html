(() => {
  'use strict';

  const text = element => element?.textContent.trim() || '';
  const texts = (element, selector) => Array.from(element.querySelectorAll(selector), text);
  const ownText = element => Array.from(element.childNodes)
    .filter(node => node.nodeType === Node.TEXT_NODE)
    .map(node => node.textContent.trim()).filter(Boolean).join(' ');

  function collectTargets(section) {
    const calculation = section.querySelector(':scope > details.calc-reveal');
    if (calculation) return [{section, option: null, reveal: calculation}];
    return Array.from(section.querySelectorAll(':scope > .option'), option => ({
      section, option, reveal: option.querySelector(':scope > details')
    })).filter(target => target.reveal);
  }

  function questionFacts(section) {
    let facts = texts(section, ':scope > .fact > ul > li');
    // Some numbered paragraphs are givens. Strip only a complete closing set of choices.
    const lastFive = facts.slice(-5);
    if (lastFive.length === 5 && lastFive.every((line, i) => line.startsWith('①②③④⑤'[i]))) {
      facts = facts.slice(0, -5);
    } else if (/^①.*②.*③.*④.*⑤/u.test(facts.at(-1) || '')) {
      facts = facts.slice(0, -1);
    }
    return facts.map(line => line.replace(/(?:아래 금액은|다음 보기는|각 선지는) .*순서.*$/u, '').trim())
      .filter(Boolean);
  }

  function reviewEvidence({option, reveal}) {
    if (option) {
      const solution = reveal.querySelector(':scope > .solution');
      return [text(solution.querySelector(':scope > strong')) + ' · ' + ownText(solution)];
    }
    // The first column contains a live copy of the learner's input. Read the two
    // official columns explicitly, including each subquestion's unit and rounding.
    const lines = [];
    for (const row of reveal.querySelectorAll('.calc-values')) {
      const answer = text(row.querySelector(':scope > div:nth-child(2) > dd'));
      const basis = text(row.querySelector(':scope > div:nth-child(3) > dd'));
      lines.push(text(row.previousElementSibling) + ' — ' + answer + '\n' + basis);
    }
    return lines.concat(texts(reveal, ':scope > .solution > ol > li'));
  }

  function references({section, option}) {
    const source = Array.from(section.querySelectorAll(':scope > details'))
      .find(el => text(el.querySelector(':scope > summary')) === '근거 조문과 교재 위치');
    if (!source) return [];
    const links = Array.from(source.querySelectorAll('a[href^="https://"]'), a => {
      const url = a.getAttribute('href');
      return text(a) + ' ' + url;
    });
    const pages = option ? texts(option, ':scope > details .solution a[data-preview]') : [];
    const pageRange = text(source.querySelector(':scope > p')).match(/교재\s*[\d,.ㆍ·～~ /\-및]+쪽/u)?.[0];
    return [pages.length ? pages.join(' · ') : pageRange, ...links].filter(Boolean);
  }

  function buildPrompt(target, review, answerText = '') {
    const {section, option} = target;
    const subject = text(document.querySelector('header .kicker')).split('/')[0].trim();
    const serial = text(section.querySelector(':scope > .serial')).split('/')[0].trim();
    const label = option ? text(option.querySelector(':scope > b')) + ' 선지' : '계산형';
    const context = texts(section, ':scope > p:not([class])').concat(questionFacts(section));
    if (option) context.push('판단할 선지\n' + ownText(option));
    const heading = review ? '[내 풀이 점검]' : '[힌트 한 단계]';
    const parts = [
      heading + ' ' + subject + ' · ' + serial + ' · ' + label + '\n' +
        text(document.querySelector('main > footer')).replace(/\s+/g, ' '),
      '문제 자료\n' + context.join('\n')
    ];
    if (review) {
      parts.push('학습 자료의 현행 판정과 풀이\n' + reviewEvidence(target).join('\n'));
      const sources = references(target);
      if (sources.length) parts.push('참고 자료 (조문 링크는 문항 공통)\n' + sources.join('\n'));
    }
    if (answerText.trim()) parts.push('내가 포함한 답·풀이\n' + answerText.trim());
    parts.push('이 자료의 법령 판단 기준일과 문제에 제시된 거래일·귀속기간을 구분해 주세요.');
    if (review) {
      parts.push('제시된 근거를 바탕으로 풀이를 한 단계씩 점검해 주세요. 내 판단 과정이 없으면 먼저 어떤 조건이나 식을 사용했는지 물어보고 답을 기다려 주세요. 풀이가 있으면 처음 달라진 단계와 그 근거를 짚어 주세요. 결론이 같으면 조건 하나를 바꿔 다시 질문해 주세요. 자료와 다른 결론이면 적용 조문·시행일·전제 중 무엇이 달라지는지 확인하고, 확인되지 않은 근거는 구분해 주세요.');
    } else {
      parts.push('첫 판단에 필요한 조건을 내가 스스로 찾도록 짧은 힌트 질문 딱 하나만 해 주세요. 정오, 정답, 적용할 세율·금액, 완성된 산식이나 근거 조문의 결론은 공개하지 말고 내 답을 기다려 주세요.');
    }
    return parts.join('\n\n');
  }

  window.CTAExamAI = {collectTargets, buildPrompt};
})();
