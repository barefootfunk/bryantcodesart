import React, { useRef, useState, useMemo } from 'react';
import { useGesture } from '@use-gesture/react';
import { useInterval } from 'usehooks-ts';
import { TerminalWindowProps } from './TerminalWindowProps';
import { DrawFill } from './DrawFill';
import { TerminalWindow } from './TerminalWindow';
import { useImgElement } from './useImgElement';
import { CustomCursorHover } from './CustomCursor';
import { TerminalWindowButton } from './TerminalWindowButton';
import { SceneName } from './SceneController';
import { SlideName } from './SlideName';
import { contactHref } from './contactHref';
// import { useImgElement } from './useImgElement';

const resolutionMultiplier = 2.0;

const drawFatLinePath = (
  ctx:CanvasRenderingContext2D,
  [x1, y1]:[number, number],
  [x2, y2]:[number, number],
  stroke:number,
) => {
  // The angle between our points
  const angle = Math.atan2(y2 - y1, x2 - x1);

  // Start on a point tangential to circle1
  ctx.moveTo(
    x1 + Math.cos(angle + Math.PI / 2) * stroke,
    y1 + Math.sin(angle + Math.PI / 2) * stroke,
  );
  // Arc 180 deg to other side of c1
  ctx.arc(x1, y1, stroke, angle + Math.PI / 2, angle - Math.PI / 2);
  // Line to corresponding point on c2
  ctx.lineTo(
    x2 + Math.cos(angle - Math.PI / 2) * stroke,
    y2 + Math.sin(angle - Math.PI / 2) * stroke,
  );
  // Arc 180 to other side of c2
  ctx.arc(x2, y2, stroke, angle - Math.PI / 2, angle + Math.PI / 2);

  // Closing the path takes us back to our first point
};

export const DrawToRevealCanvas = ({ drawFill, onDraw = () => {} }:{
  drawFill:DrawFill;
  onDraw:() => void;
}) => {
  const canvasRef = useRef<HTMLCanvasElement|null>(null);

  const gestureProps = useGesture(
    {
      // @ts-ignore
      onDrag: ({ xy, delta }) => {
        if (!canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) throw new Error('no ctx');
        const [x, y] = xy;
        const [prevX, prevY] = [x - delta[0], y - delta[1]];
        const stroke = canvasRef.current.width / 10;
        const { width, height } = canvasRef.current;

        ctx.save();
        ctx.beginPath();
        drawFatLinePath(ctx, [prevX, prevY], [x, y], stroke);
        ctx.clip();
        drawFill(ctx, width, height);
        ctx.restore();

        onDraw();
      },
    },
    {
      transform: ([x, y]) => {
        if (!canvasRef.current) return [x, y];
        const boundingRect = canvasRef.current.getBoundingClientRect();
        return [(x - boundingRect.left) * resolutionMultiplier,
          (y - boundingRect.top) * resolutionMultiplier];
      },
    },
  );

  // Update canvas resolution if dimensions change
  useInterval(() => {
    if (!canvasRef.current) return;
    if (canvasRef.current.width !== canvasRef.current.offsetWidth * resolutionMultiplier
      || canvasRef.current.height !== canvasRef.current.offsetHeight * resolutionMultiplier) {
      canvasRef.current.width = canvasRef.current.offsetWidth * resolutionMultiplier;
      canvasRef.current.height = canvasRef.current.offsetHeight * resolutionMultiplier;
    }
  }, 200);

  return (
    <CustomCursorHover cursor="paint">
      <canvas
        ref={canvasRef}
        {...gestureProps()}
        className="top-0 left-0 w-full h-full top left touch-none"
      />
    </CustomCursorHover>
  );
};

const useAddDrawFill = (drawFills:[DrawFill, string][], src:string, color:string) => {
  const rotationAmount = useMemo(() => Math.random(), []);
  const { img } = useImgElement(src);
  drawFills.push([(ctx, w, h) => {
    const padding = w / 4;
    const aspectRatio = img.naturalWidth / img.naturalHeight;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, h);

    const areaW = w - padding * 2;
    const areaH = h - padding * 2;

    const scaledImageW = areaW;
    const scaledImageH = areaW / aspectRatio;

    const rotation = ((rotationAmount * -3 + 1) * Math.PI) / 50;
    ctx.translate(w / 2, h / 2);
    ctx.rotate(rotation);
    ctx.translate(-w / 2, -h / 2);

    ctx.drawImage(
      img,
      padding,
      padding + (areaH - scaledImageH) / 2,
      scaledImageW,
      scaledImageH,
    );

    ctx.resetTransform();
  }, color]);
};

export const SkillArtWindow = ({
  setScene, setSlide,
  ...terminalWindowProps
}: {
  setScene:(_scene:SceneName) => void,
  setSlide:(_slide:SlideName) => void,
} & Omit<TerminalWindowProps, 'children'>) => {
  const drawFills:[DrawFill, string][] = [];
  const [colorsUsed, setColorsUsed] = useState<Set<number>>(new Set());
  useAddDrawFill(drawFills, '/images/skills/career.svg', 'red');
  useAddDrawFill(drawFills, '/images/skills/visual-styling.svg', 'violet');
  useAddDrawFill(drawFills, '/images/skills/communication.svg', 'orange');
  useAddDrawFill(drawFills, '/images/skills/cutting-edge.svg', 'yellow');
  useAddDrawFill(drawFills, '/images/skills/design-systems.svg', 'lime');
  useAddDrawFill(drawFills, '/images/skills/table-stakes.svg', 'blue');

  const [currentFill, setCurrentFill] = useState(0);

  const [showInstructions, setShowInstructions] = useState(true);
  const [showCta, setShowCta] = useState(false);
  return (
    <>
      <TerminalWindow
        {...terminalWindowProps}
        draggableByTitleBarOnly
        noCloseButton
      >

        <div
          className="absolute top-0 left-0 grid w-full h-full overflow-hidden place-items-center"
        >
          <div
            className="absolute top-[-10%] left-[-10%] w-[120%] h-[120%]
            rotate-[5deg] touch-none"
          >
            <DrawToRevealCanvas
              drawFill={drawFills[currentFill][0]}
              onDraw={() => {
                if (showInstructions) setShowInstructions(false);
                if (!colorsUsed.has(currentFill)) {
                  setColorsUsed((currentSet) => new Set([...currentSet, currentFill]));
                  if (colorsUsed.size > 0) {
                    setShowCta(true);
                  }
                }
              }}
            />
          </div>
          {showInstructions && (
          <div className="font-display text-center text-[4em] leading-[1] uppercase text-[#ccc] translate-y-[-10%] pointer-events-none">
            Draw on me
            <br />
            in every color
          </div>
          )}
          <div className="absolute top-0 left-0 flex">
            {drawFills.map(
              ([_drawFill, color], index) => (
                <button
                  onClick={() => setCurrentFill(index)}
                  type="button"
                  className={`grid place-items-center  border-black w-[3em] h-[3em]
                  ${currentFill === index ? 'border-[0.5em]' : 'border-2'}
                `}
                  style={{
                    backgroundColor: color,
                  }}
                  aria-label={color}
                />
              ),
            )}

          </div>
        </div>
      </TerminalWindow>
      {showCta && (
      <TerminalWindow
        title={null}
        className="justify-self-end  mt-[-1em] mr-[-1em]"
      >
        <nav className="p-[0.75em] flex gap-[0.75em] items-end h-full">
          <TerminalWindowButton
            key="art-board"
            color="black"
            bgColor="yellow"
            onClick={() => {
              setScene('menu');
              setSlide('intro');
            }}
          >
            BACK_TO_MENU
          </TerminalWindowButton>
          <TerminalWindowButton
            key="back-to-menu-and-contact"
            bgColor="yellow"
            href={contactHref}
          >
            CONTACT_ME
          </TerminalWindowButton>
        </nav>
      </TerminalWindow>
      )}
    </>
  );
};
