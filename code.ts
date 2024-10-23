const FONT = { family: "Manrope", style: "Regular" };
const FALLBACK_FONT = { family: "Inter", style: "Regular" };

async function loadFont(): Promise<FontName> {
	try {
		await figma.loadFontAsync(FONT);
		return FONT;
	} catch {
		return FALLBACK_FONT;
	}
}

function createBaseFrame(name: string): FrameNode {
	const frame = figma.createFrame();
	frame.layoutMode = "VERTICAL";
	frame.primaryAxisSizingMode = "AUTO"; 
	frame.counterAxisSizingMode = "AUTO";
	frame.name = name;
	return frame;
}

function createTextNode(
	text: string, 
	fontSize: number,
	font: FontName,
	linkId?: string
): TextNode {
	const node = figma.createText();
	node.fontName = font;
	node.fontSize = fontSize;
	node.characters = text;
	if (linkId) {
		node.hyperlink = { type: "NODE", value: linkId };
	}
	return node;
}

async function generateTableOfContents(): Promise<FrameNode> {
	const font = await loadFont();
	
	// Create main frame
	const frame = createBaseFrame("Table of Contents");
	frame.paddingLeft = frame.paddingRight = 40;
    frame.paddingTop = frame.paddingBottom = 40;
	frame.itemSpacing = 24;
	frame.cornerRadius = 16;

	// Create hierarchy frame
	const hierarchyFrame = createBaseFrame("Section Hierarchy");
	hierarchyFrame.paddingLeft = hierarchyFrame.paddingRight = 16;
    hierarchyFrame.paddingTop = hierarchyFrame.paddingBottom = 16;
	hierarchyFrame.itemSpacing = 16;

	// Add sections
	const sections = figma.currentPage.children.filter(
		node => node.type === "SECTION"
	) as SectionNode[];

	for (const section of sections) {
		hierarchyFrame.appendChild(
			createTextNode(section.name + "→", 24, font, section.id)
		);

		const childSections = section.findChildren(
			node => node.type === "SECTION"
		) as SectionNode[];
		
		if (childSections.length) {
			const childFrame = createBaseFrame("Child Sections");
			childFrame.paddingLeft = 16;
			childFrame.itemSpacing = 8;

			childSections.forEach(child => {
				childFrame.appendChild(
					createTextNode("- " + child.name, 16, font, child.id)
				);
			});
			
			hierarchyFrame.appendChild(childFrame);
		}
	}

	// Add title and content
	const divider = figma.createLine();
	divider.strokes = [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }];
	divider.strokeWeight = 1;

	frame.appendChild(createTextNode("Table of Contents", 32, font));
	frame.appendChild(divider);
	frame.appendChild(hierarchyFrame);

	// Position in viewport
	const center = figma.viewport.center;
	frame.x = center.x - frame.width / 2;
	frame.y = center.y - frame.height / 2;

	figma.currentPage.appendChild(frame);
	return frame;
}

async function main() {
	const notification = figma.notify('Generating Table of Contents...', {
		timeout: 10000
	});

	try {
		const frame = await generateTableOfContents();
		figma.viewport.scrollAndZoomIntoView([frame]);
		notification.cancel();
		figma.notify('Table of Contents created!', { timeout: 2000 });
	} catch (error) {
		figma.notify('Error creating Table of Contents', { error: true });
	} finally {
		figma.closePlugin();
	}
}

main();
