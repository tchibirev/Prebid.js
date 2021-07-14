import { expect } from 'chai';
import { Renderer } from 'src/Renderer.js';
import * as utils from 'src/utils.js';
import { loadExternalScript } from 'src/adloader.js';
require('test/mocks/adloaderStub.js');

describe('Renderer', function () {
  let oldAdUnits;
  beforeEach(function () {
    oldAdUnits = $$PREBID_GLOBAL$$.adUnits;
    $$PREBID_GLOBAL$$.adUnits = [];
  });

  afterEach(function () {
    $$PREBID_GLOBAL$$.adUnits = oldAdUnits;
  });

  describe('Renderer: A renderer installed on a bid response', function () {
    let testRenderer1;
    let testRenderer2;
    let spyRenderFn;
    let spyEventHandler;

    beforeEach(function () {
      testRenderer1 = Renderer.install({
        url: 'https://httpbin.org/post',
        config: { test: 'config1' },
        id: 1
      });
      testRenderer2 = Renderer.install({
        url: 'https://httpbin.org/post',
        config: { test: 'config2' },
        id: 2
      });

      spyRenderFn = sinon.spy();
      spyEventHandler = sinon.spy();
    });

    it('is an instance of Renderer', function () {
      expect(testRenderer1 instanceof Renderer).to.equal(true);
    });

    it('has expected properties ', function () {
      expect(testRenderer1.url).to.equal('https://httpbin.org/post');
      expect(testRenderer1.config).to.deep.equal({ test: 'config1' });
      expect(testRenderer1.id).to.equal(1);
    });

    it('returns config from getConfig method', function () {
      expect(testRenderer1.getConfig()).to.deep.equal({ test: 'config1' });
      expect(testRenderer2.getConfig()).to.deep.equal({ test: 'config2' });
    });

    it('sets a render function with setRender method', function () {
      testRenderer1.setRender(spyRenderFn);
      expect(typeof testRenderer1.render).to.equal('function');
      testRenderer1.render();
      expect(spyRenderFn.called).to.equal(true);
    });

    it('sets event handlers with setEventHandlers method and handles events with installed handlers', function () {
      testRenderer1.setEventHandlers({
        testEvent: spyEventHandler
      });

      expect(testRenderer1.handlers).to.deep.equal({
        testEvent: spyEventHandler
      });

      testRenderer1.handleVideoEvent({ id: 1, eventName: 'testEvent' });
      expect(spyEventHandler.called).to.equal(true);
    });

    it('pushes commands to queue if renderer is not loaded', function () {
      testRenderer1.loaded = false;
      testRenderer1.push(spyRenderFn);
      expect(testRenderer1.cmd.length).to.equal(1);

      // clear queue for next tests
      testRenderer1.cmd = [];
    });

    it('fires commands immediately if the renderer is loaded', function () {
      const func = sinon.spy();

      testRenderer1.loaded = true;
      testRenderer1.push(func);

      expect(testRenderer1.cmd.length).to.equal(0);

      sinon.assert.calledOnce(func);
    });

    it('processes queue by calling each function in queue', function () {
      testRenderer1.loaded = false;
      const func1 = sinon.spy();
      const func2 = sinon.spy();

      testRenderer1.push(func1);
      testRenderer1.push(func2);
      expect(testRenderer1.cmd.length).to.equal(2);

      testRenderer1.process();

      sinon.assert.calledOnce(func1);
      sinon.assert.calledOnce(func2);
      expect(testRenderer1.cmd.length).to.equal(0);
    });
  });

  describe('3rd party renderer', function () {
    let utilsSpy;
    before(function () {
      utilsSpy = sinon.spy(utils, 'logWarn');
    });

    after(function() {
      utilsSpy.restore();
    });

    it('should not load renderer and log warn message', function() {
      $$PREBID_GLOBAL$$.adUnits = [{
        code: 'video1',
        renderer: {
          url: 'http://acdn.adnxs.com/video/outstream/ANOutstreamVideo.js',
          render: sinon.spy()
        }
      }]

      let testRenderer = Renderer.install({
        url: 'https://httpbin.org/post',
        config: { test: 'config1' },
        id: 1,
        adUnitCode: 'video1'
      });
      testRenderer.setRender(() => {})

      testRenderer.render()
      expect(utilsSpy.callCount).to.equal(1);
    });

    it('should load renderer adunit renderer when backupOnly', function() {
      $$PREBID_GLOBAL$$.adUnits = [{
        code: 'video1',
        renderer: {
          url: 'http://acdn.adnxs.com/video/outstream/ANOutstreamVideo.js',
          backupOnly: true,
          render: sinon.spy()
        }
      }]

      let testRenderer = Renderer.install({
        url: 'https://httpbin.org/post',
        config: { test: 'config1' },
        id: 1,
        adUnitCode: 'video1'

      });
      testRenderer.setRender(() => {})

      testRenderer.render()
      expect(loadExternalScript.called).to.be.true;
    });

    it('should load external script instead of publisher-defined one when backupOnly option is true in mediaTypes.video options', function() {
      $$PREBID_GLOBAL$$.adUnits = [{
        code: 'video1',
        mediaTypes: {
          video: {
            context: 'outstream',
            mimes: ['video/mp4'],
            playerSize: [[400, 300]],
            renderer: {
              url: 'https://acdn.adnxs.com/video/outstream/ANOutstreamVideo.js',
              backupOnly: true,
              render: sinon.spy()
            },
          }
        }
      }]

      let testRenderer = Renderer.install({
        url: 'https://httpbin.org/post',
        config: { test: 'config1' },
        id: 1,
        adUnitCode: 'video1'

      });
      testRenderer.setRender(() => {})

      testRenderer.render()
      expect(loadExternalScript.called).to.be.true;
    });

    it('should call loadExternalScript() for script not defined on adUnit, only when .render() is called', function() {
      $$PREBID_GLOBAL$$.adUnits = [{
        code: 'video1',
        renderer: {
          url: 'http://cdn.adnxs.com/renderer/video/ANOutstreamVideo.js',
          render: sinon.spy()
        }
      }];
      let testRenderer = Renderer.install({
        url: 'https://httpbin.org/post',
        config: { test: 'config1' },
        id: 1,
        adUnitCode: undefined
      });
      expect(loadExternalScript.called).to.be.false;

      testRenderer.render()
      expect(loadExternalScript.called).to.be.true;
    });
  });
});
