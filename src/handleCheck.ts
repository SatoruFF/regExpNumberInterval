export function trigger(start: number, end: number) {

    if (isNaN(start) || isNaN(end)) {
        throw new Error('Некрректные данные')
    }

    const regex: string = getNumericalRangeRegex(start, end);

    return regex
  }
  
  
  function getNumericalRangeRegex(start: number, end: number) : string {
    // Конец не больше чем начало?
    if (start > end) {
        throw new Error('Некрректные данные')
    }
    
    let result: string = '';
    let ranges: any = [];
    const regexes: RangeRegexConstruct[] = [];
    ranges.push(new AmbigiousRange(start, end));
    
    while (ranges.length > 0) {
      const range: Range | any = ranges.pop();
      
      if (range.canResolve()) {
        regexes.push(range.getRegex());
      } else {
        ranges = ranges.concat(range.getSubRanges());
      }
    }
    
    const regexStrs: string[] = regexes.map((regex) => {
      return regex.getRegexString();
    });
    
    console.log(regexStrs);
    
    if (regexStrs.length === 1) {
      result = `^${regexStrs[0]}$`
    } else {
      result = `^(${regexStrs.join('|')})$`
    }
    
    return result;
  }
  
  // Одинаковой ли длины числа?
  function sameLength(a: string, b: string) : boolean {
    return a.length === b.length;
  }
  
  // Получаем общую префиксную подстроку двух входных строк
  function getCommonPrefixSubstrFrom(a: string, b: string) : string {
    let longerStr: string, shorterStr: string;
    let commonPrefixSubStr: string = '';
    
    if (a.length > b.length) {
      longerStr = a;
      shorterStr = b;
    } else {
      longerStr = b;
      shorterStr = a;
    }
    
    for (let i: number = 0; i < shorterStr.length; i++) {
      if (shorterStr[i] !== longerStr[i]) {
        break;
      }
      
      commonPrefixSubStr += shorterStr[i];
    }
    
    return commonPrefixSubStr;
  }
  
  enum RangeRegexType {
    Equal = 1,
    Primitive,
    OptimizedWithLeading,
    WholeRangeBeResolvedWithoutLeading,
    RangeBeResolvedWithoutLeading,
  }
  
  class RangeRegexConstruct {
    private range: NumericalRange | any;
    private regex: string | any;
    
    constructor(range: NumericalRange, type: RangeRegexType) {
      const startStr = range.getStart().toString();
      const endStr = range.getEnd().toString();
      let leadingString = range.getLeadingStr();
      if (range instanceof NegativeRange) {
        leadingString = `-${leadingString}`;
      }
      
      switch(type) { 
        case RangeRegexType.Equal: {
          this.regex = `(${leadingString}${startStr})`;
          break;
        }
        case RangeRegexType.Primitive: {
          this.regex = `(${leadingString}[${startStr}-${endStr}])`;
          break;
        }
        case RangeRegexType.OptimizedWithLeading: {
          if (endStr.length > 0 && startStr.length > 0) {
            if (startStr[0] === '0' && endStr[0] === '9') {
              this.regex = `(${leadingString}[0-9]{${endStr.length}})`;
            } else {
              this.regex = `(${leadingString}[${startStr[0]}-${endStr[0]}][0-9]{${endStr.length-1}})`; 
            }
          }
          
          break;
        }
        case RangeRegexType.WholeRangeBeResolvedWithoutLeading: {
          if (endStr.length > 0 ) {
            if (endStr[0] === '9') {
              this.regex = `(${leadingString}[0-9]{1,${endStr.length}})`;
            } else {
              this.regex = `(${leadingString}[${startStr[0]}-${endStr[0]}]?[0-9]{1,${endStr.length-1}})`;
            }
          }
          break;
        } 
        case RangeRegexType.RangeBeResolvedWithoutLeading: {
          if (endStr.length > 0 && startStr.length > 0) {
            this.regex = `(${leadingString}[${startStr[0]}-${endStr[0]}][0-9]{${endStr.length-1}})`;
          }
          
          break;
        }
        default: {
          break;
        }
      }
      
      this.range = range;
    }
    
    public getRegexString() : string {
      return this.regex;
    }
  }
  

  class AmbigiousRange {
    private start: number;
    private end: number;

    constructor (start: number = 0, end: number = 0) {
      if (start > end) {
        throw new RangeError('Начало не может быть больше чем конец');
      }
      
      this.start = start;
      this.end = end;
    }
    
    private hasPositiveRange() : boolean {
      return this.end >= 0;
    }
    
    private getPositiveRange() : PositiveRange {
      if (!this.hasPositiveRange()) {
        throw new RangeError('Нельзя вернуть положительный диапазон если его нет');
      }

      // Вернуть старт больше 0 если он не отрициельный
      const start: number = this.start > 0 ? this.start : 0
      
      return new PositiveRange(start, this.end)
    }
    
    private hasNegativeRange() : boolean {
      return this.start < 0;
    }
    
    private getNegativeRange() : NegativeRange {
      if (!this.hasNegativeRange()) {
        throw new RangeError('Нельзя вернуть отрицательный диапазон если его нет');
      }
      
      // Вернуть конец < -1 если он не отрицательный
      const end: number = this.end < 0 ? this.end : -1
      
      return new NegativeRange(-end, -this.start);
    }
    
    // Не удается разрешить - необходимо разделить на положительный и отрицательный диапазоны;
    public canResolve() : boolean {
      return false;
    }
    
    public getSubRanges() {
      const ranges = [];
      
      if (this.hasPositiveRange()) {
        ranges.push(this.getPositiveRange());
      }
      if (this.hasNegativeRange()) {
        ranges.push(this.getNegativeRange());
      }
      
      return ranges;
    }
    
    public getRegex() : RangeRegexConstruct {
      throw new Error('не удается вернуть конструкцию регулярного выражения диапазона без синтаксического анализа диапазона');
    }
  }
  
  class NumericalRange {
    public leadingString: string;
    public start: number;
    public end: number;
    
    constructor (start: number = 0, end: number = 0, leadingString: string = '') {   
      if (start > end || start < 0) {
        throw new RangeError('диапазон классов: начальное значение не может быть больше конечного значения');
      }
      
      let startStr: string = start.toString();
      let endStr: string = end.toString();
      let commonPrefixSubstr: string = '';
      
      // Если строки имеют одинаковую длину, мы хотим удалить все общие
      // префиксы перед вычислением остальной части диапазона
      if (start !== end && startStr.length > 1 && sameLength(startStr, endStr)) {
        commonPrefixSubstr = getCommonPrefixSubstrFrom(startStr, endStr);
        startStr = startStr.replace(commonPrefixSubstr, '');
        endStr = endStr.replace(commonPrefixSubstr, '');
      }
      
      this.leadingString = leadingString + commonPrefixSubstr;
      this.start = parseInt(startStr);
      this.end = parseInt(endStr);
    }
  
    public hasLeadingUnits() : boolean {
      return this.leadingString.length > 0;
    }
    
    // Возвращает значение true, если диапазон состоит только из одного числа
    public isRangeOneNumber() : boolean {
      return this.start === this.end;
    }
    
    // Если диапазон находится в его примитивном виде
    // Т.е. начало и конец находятся в диапазоне от 0 до 9
    private isRangeAtPrimitive() : boolean {
      return this.start < 10 && this.end < 10;
    }
    
    private isStartZero() : boolean {
      return this.start === 0
    }
  
    private isEndAllNine() : boolean {
      let check: number = this.end + 1;
   
      while(check > 1) {
        if (check % 10 !== 0) {
          return false;
        }
        
        check /= 10;
      }
      
      // Все проверки пройдены, возвращается значение true
      return true;
    }
    
    private isStartSameLengthAsEnd() : boolean {
      return this.start.toString().length === this.end.toString().length;
    }
    
    // Вся цифра здесь относится к левому значащему числу как к чему угодно
    // от 1 до 9, в то время как остальные числа равны 0
    // должно быть не менее 10 и выше
    // например 10, 100, 1000, 2000, 5000, 100000
    private isStartWholeFigure() : boolean {
      let check: number = this.start;
      if (check < 10) {
        return false;
      }
      
      while(check > 10) {
        if (check % 10 !== 0) {
          return false;
        }
        
        check /= 10;
      }
      
      // Все проверки пройдены, возвращается значение true
      return true;
    }
    
    // Все цифры здесь относится к левому значащему числу как к чему угодно
    // от 1 до 9, в то время как остальные числа равны 0
    // должно быть не менее 19 и выше
    //
    // Для цифры минус один:
    //
    // например 19, 99, 299, 599, 1999, 19999, 29999, 99999
    private isEndWholeFigureMinusOne() : boolean {
      let check: number = this.end + 1;
      if (check < 10) {
        return false;
      }
      
      while(check > 10) {
        if (check % 10 !== 0) {
          return false;
        }
        
        check /= 10;
      }
      
      // Все проверки пройдены, возвращается значение true
      return true;
    }
    
    private canRangeBeResolvedWithLeading() : boolean {
      return this.hasLeadingUnits() &&
        ((this.isStartWholeFigure() && this.isEndWholeFigureMinusOne() && this.isStartSameLengthAsEnd()) ||
        (this.isStartZero() && (this.isEndWholeFigureMinusOne() || this.isEndAllNine())));
    }
    
    // Весь диапазон - начинается с 0 и заканчивается всеми девятками
    // без ведущего
    private canWholeRangeBeResolvedWithoutLeading() : boolean {
      return !this.hasLeadingUnits() && this.isStartZero() && this.isEndWholeFigureMinusOne()
    }
    
    private canRangeBeResolvedWithoutLeading() : boolean {
      return !this.hasLeadingUnits() && this.isStartWholeFigure() && this.isEndWholeFigureMinusOne() && this.isStartSameLengthAsEnd();
    }
    
    public getNextClosestWholeFig() : any {
      let startCheck = this.start;
      let endCheck = this.end;
      let counter = 0
      
      while (endCheck >= 10) {
        endCheck /= 10;
        startCheck /= 10;
        counter++;
      }
      
    // Превратить в цельное число
      startCheck = Math.ceil(startCheck);
      
      while (counter > 0) {
        startCheck *= 10;
        counter--;
      }
      
      return startCheck;
    }
    
    public getPrevClosestWholeFig() : number {
      let check = this.end + 1;
      let counter = 0
      
      while (check >= 10) {
        check /= 10;
        counter++;
      }
      
      // Превратить в цельное число
      check = Math.floor(check);
      
      while (counter > 0) {
        check *= 10;
        counter--;
      }
      
      return check;
    }
    
    public canResolve() : boolean {
      if (this.isRangeOneNumber() || this.isRangeAtPrimitive() || 
          this.canRangeBeResolvedWithLeading() || 
          this.canWholeRangeBeResolvedWithoutLeading() ||
          this.canRangeBeResolvedWithoutLeading()) { 
        return true;
      }
      
      return false;
    }
    
    public getRegex() : RangeRegexConstruct {
      if (!this.canResolve()) {
        throw new RangeError('числовой диапазон класса: не может быть разрешен');
      }
      
      let regexType: any;
      
      if (this.isRangeOneNumber()) {
        regexType = RangeRegexType.Equal;
      } else if (this.isRangeAtPrimitive()) {
        regexType = RangeRegexType.Primitive;
      } else if (this.canRangeBeResolvedWithLeading()) {
        regexType = RangeRegexType.OptimizedWithLeading;
      } else if (this.canWholeRangeBeResolvedWithoutLeading()) {
        regexType = RangeRegexType.WholeRangeBeResolvedWithoutLeading;
      } else if (this.canRangeBeResolvedWithoutLeading()) {
        regexType = RangeRegexType.RangeBeResolvedWithoutLeading;
      }
      
      return new RangeRegexConstruct(this, regexType);
    }
    
    public getSubRanges() : Range[] {
      if (this.canResolve()) {
        throw new RangeError('числовой диапазон класса: может быть разрешен - вместо этого получаются недопустимые значения диапазона');
      }
  
      return [];
    }
    
    public getStart() : number {
      return this.start;
    }
    
    public getEnd() : number {
      return this.end;
    }
    
    public getLeadingStr() : string {
      return this.leadingString;
    }
  }
  
  // Класс только для положительных числовых диапазонов
  class PositiveRange extends NumericalRange { 
    constructor (start: number = 0, end: number = 0, leadingString: string = '') {
      super(start, end, leadingString);
    }
    
    public getSubRanges() : Range[] {
      if (this.canResolve()) {
        throw new RangeError('числовой диапазон класса: может быть разрешен - вместо этого получаются недопустимые значения диапазона');
      }
      
      const ranges: any = [];
      const nextClosestWholeFig = this.getNextClosestWholeFig();
      const prevClosestWholeFig = this.getPrevClosestWholeFig();
      
      console.log(this.start, nextClosestWholeFig, this.end, prevClosestWholeFig)
      
      if (this.leadingString === '11' || nextClosestWholeFig === 10) {
        console.log(`${this.leadingString}${this.start} - ${this.leadingString}${this.end}`, nextClosestWholeFig, prevClosestWholeFig);
      }
      if (this.start < nextClosestWholeFig) {
        if (this.hasLeadingUnits() && (nextClosestWholeFig-1).toString().length !== nextClosestWholeFig.toString().length) {
          ranges.push(new PositiveRange(this.start, nextClosestWholeFig - 1, this.leadingString + '0'));
        } else {
          ranges.push(new PositiveRange(this.start, nextClosestWholeFig - 1, this.leadingString)); 
        }
      }
      if (nextClosestWholeFig < prevClosestWholeFig) {
        if (this.hasLeadingUnits() && (prevClosestWholeFig-1).toString().length !== prevClosestWholeFig.toString().length && prevClosestWholeFig < this.end) {
          ranges.push(new PositiveRange(nextClosestWholeFig, prevClosestWholeFig - 1, this.leadingString + '0'));
        } else {
          ranges.push(new PositiveRange(nextClosestWholeFig, prevClosestWholeFig - 1, this.leadingString)); 
        }
      }
      if (prevClosestWholeFig <= this.end) {
        ranges.push(new PositiveRange(prevClosestWholeFig, this.end, this.leadingString));
      }
      
      return ranges;
    }
  }
  
  class NegativeRange extends NumericalRange {
    constructor (start: number = 1, end: number = 1, leadingString: string = '') {
      super(start, end, leadingString);
    }
    
    public getSubRanges() : Range[] {
      if (this.canResolve()) {
        throw new RangeError('числовой диапазон класса: может быть разрешен - вместо этого получаются недопустимые значения диапазона');
      }
      
      const ranges: any = [];
      const nextClosestWholeFig = this.getNextClosestWholeFig();
      const prevClosestWholeFig = this.getPrevClosestWholeFig();
      
      if (this.start < nextClosestWholeFig) {
        if (this.hasLeadingUnits() && (nextClosestWholeFig-1).toString().length !== nextClosestWholeFig.toString().length) {
          ranges.push(new NegativeRange(this.start, nextClosestWholeFig - 1, this.leadingString + '0'));
        } else {
          ranges.push(new NegativeRange(this.start, nextClosestWholeFig - 1, this.leadingString)); 
        }
      }
      if (nextClosestWholeFig < prevClosestWholeFig) {
        if (this.hasLeadingUnits() && (prevClosestWholeFig-1).toString().length !== prevClosestWholeFig.toString().length && prevClosestWholeFig === this.end) {
          ranges.push(new NegativeRange(nextClosestWholeFig, prevClosestWholeFig - 1, this.leadingString + '0'));
        } else {
          ranges.push(new NegativeRange(nextClosestWholeFig, prevClosestWholeFig - 1, this.leadingString)); 
        }
      }
      if (prevClosestWholeFig <= this.end) {
        ranges.push(new NegativeRange(prevClosestWholeFig, this.end, this.leadingString));
      }
      
      return ranges;
    }
  }